from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse
from uuid import uuid4

import aiohttp
import discord
from discord.ext import tasks


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"


@dataclass(frozen=True)
class SyncConfig:
    full_sync_hours: float = 6
    role_job_poll_seconds: float = 20
    member_batch_size: int = 500
    request_timeout_seconds: float = 30
    request_retries: int = 3


@dataclass(frozen=True)
class LogConfig:
    level: str = "INFO"
    file: str = "logs/drp-bot.log"
    max_bytes: int = 5 * 1024 * 1024
    backup_count: int = 5


@dataclass(frozen=True)
class BotConfig:
    discord_token: str
    guild_id: int
    website_url: str
    bot_ingest_token: str
    sync: SyncConfig
    logging: LogConfig

    @staticmethod
    def load(path: Path = CONFIG_PATH) -> "BotConfig":
        if not path.exists():
            raise RuntimeError(
                f"{path.name} fehlt. Kopiere config.example.json zu config.json und trage die Werte ein."
            )

        try:
            raw = json.loads(path.read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError) as error:
            raise RuntimeError(f"config.json ist nicht lesbar: {error}") from error

        sync_raw = raw.get("sync") or {}
        log_raw = raw.get("logging") or {}

        discord_token = os.getenv("DRP_DISCORD_TOKEN") or str(raw.get("discord_token", "")).strip()
        ingest_token = os.getenv("DRP_BOT_INGEST_TOKEN") or str(raw.get("bot_ingest_token", "")).strip()
        website_url = (os.getenv("DRP_WEBSITE_URL") or str(raw.get("website_url", ""))).strip().rstrip("/")
        guild_value = os.getenv("DRP_GUILD_ID") or raw.get("guild_id")

        try:
            guild_id = int(guild_value)
        except (TypeError, ValueError) as error:
            raise RuntimeError("guild_id muss die numerische Discord-Server-ID sein.") from error

        placeholders = ("HIER_", "TOKEN_EINTRAGEN")
        if not discord_token or any(value in discord_token for value in placeholders):
            raise RuntimeError("In config.json fehlt ein echter discord_token.")
        if not ingest_token or any(value in ingest_token for value in placeholders):
            raise RuntimeError("In config.json fehlt der BOT_INGEST_TOKEN der Website.")
        if guild_id <= 0:
            raise RuntimeError("guild_id muss groesser als 0 sein.")

        parsed_url = urlparse(website_url)
        is_local = parsed_url.hostname in {"localhost", "127.0.0.1"}
        if parsed_url.scheme not in ({"http", "https"} if is_local else {"https"}) or not parsed_url.netloc:
            raise RuntimeError("website_url muss eine gueltige HTTPS-Adresse sein.")

        sync = SyncConfig(
            full_sync_hours=float(sync_raw.get("full_sync_hours", 6)),
            role_job_poll_seconds=float(sync_raw.get("role_job_poll_seconds", 20)),
            member_batch_size=int(sync_raw.get("member_batch_size", 500)),
            request_timeout_seconds=float(sync_raw.get("request_timeout_seconds", 30)),
            request_retries=int(sync_raw.get("request_retries", 3)),
        )
        if not 1 <= sync.member_batch_size <= 1000:
            raise RuntimeError("member_batch_size muss zwischen 1 und 1000 liegen.")
        if sync.role_job_poll_seconds < 10:
            raise RuntimeError("role_job_poll_seconds darf nicht kleiner als 10 sein.")
        if sync.full_sync_hours < 1:
            raise RuntimeError("full_sync_hours darf nicht kleiner als 1 sein.")
        if not 1 <= sync.request_retries <= 10:
            raise RuntimeError("request_retries muss zwischen 1 und 10 liegen.")

        logging_config = LogConfig(
            level=str(log_raw.get("level", "INFO")).upper(),
            file=str(log_raw.get("file", "logs/drp-bot.log")),
            max_bytes=int(log_raw.get("max_bytes", 5 * 1024 * 1024)),
            backup_count=int(log_raw.get("backup_count", 5)),
        )
        return BotConfig(
            discord_token=discord_token,
            guild_id=guild_id,
            website_url=website_url,
            bot_ingest_token=ingest_token,
            sync=sync,
            logging=logging_config,
        )


def configure_logging(config: LogConfig) -> logging.Logger:
    level = getattr(logging, config.level, logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    root.addHandler(console)

    log_path = Path(config.file)
    if not log_path.is_absolute():
        log_path = BASE_DIR / log_path
    log_path.parent.mkdir(parents=True, exist_ok=True)
    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=max(1024, config.max_bytes),
        backupCount=max(1, config.backup_count),
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    logging.getLogger("discord.http").setLevel(max(level, logging.INFO))
    return logging.getLogger("drp-bot")


class WebsiteApi:
    def __init__(self, config: BotConfig, logger: logging.Logger) -> None:
        self.base_url = config.website_url
        self.token = config.bot_ingest_token
        self.timeout_seconds = config.sync.request_timeout_seconds
        self.retries = config.sync.request_retries
        self.logger = logger
        self.session: aiohttp.ClientSession | None = None

    async def open(self) -> None:
        if self.session and not self.session.closed:
            return
        timeout = aiohttp.ClientTimeout(total=self.timeout_seconds)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/json",
                "User-Agent": "DRP-Discord-Bot/1.0",
            },
        )

    async def close(self) -> None:
        if self.session and not self.session.closed:
            await self.session.close()

    async def request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        await self.open()
        assert self.session is not None
        url = f"{self.base_url}{path}"

        for attempt in range(1, self.retries + 1):
            try:
                async with self.session.request(method, url, json=payload) as response:
                    body = await response.text()
                    if 200 <= response.status < 300:
                        if not body:
                            return {}
                        try:
                            result = json.loads(body)
                        except json.JSONDecodeError as error:
                            raise RuntimeError("Website hat keine gueltige JSON-Antwort gesendet.") from error
                        return result if isinstance(result, dict) else {"data": result}

                    message = body[:500].replace("\n", " ")
                    if response.status in {401, 403}:
                        raise RuntimeError(
                            f"Website lehnt den Bot ab ({response.status}). BOT_INGEST_TOKEN pruefen."
                        )
                    if response.status < 500 and response.status != 429:
                        raise RuntimeError(f"Website-Anfrage fehlgeschlagen ({response.status}): {message}")

                    retry_after = float(response.headers.get("Retry-After", attempt * 2))
                    if attempt < self.retries:
                        self.logger.warning(
                            "Website antwortet mit %s; neuer Versuch in %.1f Sekunden.",
                            response.status,
                            retry_after,
                        )
                        await asyncio.sleep(min(30, max(1, retry_after)))
                        continue
                    raise RuntimeError(f"Website ist nicht erreichbar ({response.status}): {message}")
            except (aiohttp.ClientError, asyncio.TimeoutError) as error:
                if attempt >= self.retries:
                    raise RuntimeError(f"Website-Verbindung fehlgeschlagen: {error}") from error
                delay = min(30, 2**attempt)
                self.logger.warning(
                    "Website-Verbindungsfehler (%s/%s): %s; neuer Versuch in %s Sekunden.",
                    attempt,
                    self.retries,
                    error,
                    delay,
                )
                await asyncio.sleep(delay)

        raise RuntimeError("Website-Anfrage ist unerwartet fehlgeschlagen.")

    async def get(self, path: str) -> dict[str, Any]:
        return await self.request("GET", path)

    async def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self.request("POST", path, payload=payload)


def batches(items: list[Any], size: int) -> Iterable[list[Any]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def external_id(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid4().hex[:8]}"


class DrpDiscordBot(discord.Client):
    def __init__(self, config: BotConfig, logger: logging.Logger) -> None:
        intents = discord.Intents.none()
        intents.guilds = True
        intents.members = True
        super().__init__(intents=intents, max_messages=None)
        self.config = config
        self.log = logger
        self.api = WebsiteApi(config, logger)
        self.full_sync_lock = asyncio.Lock()
        self.role_sync_task: asyncio.Task[None] | None = None

    async def setup_hook(self) -> None:
        await self.api.open()
        self.role_jobs_loop.change_interval(seconds=self.config.sync.role_job_poll_seconds)
        self.full_sync_loop.change_interval(hours=self.config.sync.full_sync_hours)
        self.role_jobs_loop.start()
        self.full_sync_loop.start()
        self.heartbeat_loop.start()

    async def close(self) -> None:
        for loop in (self.role_jobs_loop, self.full_sync_loop, self.heartbeat_loop):
            if loop.is_running():
                loop.cancel()
        if self.role_sync_task and not self.role_sync_task.done():
            self.role_sync_task.cancel()
        await self.api.close()
        await super().close()

    def configured_guild(self) -> discord.Guild | None:
        return self.get_guild(self.config.guild_id)

    async def on_ready(self) -> None:
        guild = self.configured_guild()
        if guild is None:
            self.log.error(
                "Bot ist online, aber nicht auf dem konfigurierten Server %s. Guild-ID und Einladung pruefen.",
                self.config.guild_id,
            )
            return
        self.log.info(
            "Bot ist als %s (%s) online | Server: %s (%s) | Mitglieder: %s",
            self.user,
            self.user.id if self.user else "unbekannt",
            guild.name,
            guild.id,
            guild.member_count,
        )
        await self.send_event(
            "DISCORD_BOT_CONNECTED",
            {
                "botUserId": str(self.user.id) if self.user else None,
                "botUserName": str(self.user) if self.user else None,
                "guildName": guild.name,
                "memberCount": guild.member_count,
            },
        )

    async def on_resumed(self) -> None:
        self.log.info("Discord-Gateway-Verbindung wurde fortgesetzt.")

    async def on_disconnect(self) -> None:
        self.log.warning("Discord-Gateway-Verbindung wurde unterbrochen; discord.py verbindet automatisch neu.")

    async def on_error(self, event_method: str, *args: Any, **kwargs: Any) -> None:
        self.log.exception("Unbehandelter Fehler im Discord-Ereignis %s", event_method)

    async def send_event(self, event_type: str, data: dict[str, Any]) -> None:
        try:
            await self.api.post(
                "/api/bot/events",
                {
                    "type": event_type,
                    "discordGuildId": str(self.config.guild_id),
                    "source": "discord-bot",
                    "data": data,
                },
            )
        except Exception as error:
            self.log.warning("Bot-Ereignis konnte nicht an die Website gesendet werden: %s", error)

    async def send_heartbeat(self) -> None:
        guild = self.configured_guild()
        await self.api.post(
            "/api/bot/data",
            {
                "namespace": "integrations",
                "key": "discord-bot",
                "discordGuildId": str(self.config.guild_id),
                "data": {
                    "status": "online" if self.is_ready() else "connecting",
                    "botUserId": str(self.user.id) if self.user else None,
                    "botUserName": str(self.user) if self.user else None,
                    "guildName": guild.name if guild else None,
                    "memberCount": guild.member_count if guild else None,
                    "latencyMs": round(self.latency * 1000),
                    "checkedAt": discord.utils.utcnow().isoformat(),
                },
            },
        )

    @staticmethod
    def member_payload(member: discord.Member, *, removed: bool = False) -> dict[str, Any]:
        return {
            "id": str(member.id),
            "username": member.name,
            "displayName": member.display_name,
            "avatarUrl": str(member.display_avatar.url) if member.display_avatar else None,
            "roleIds": []
            if removed
            else [str(role.id) for role in member.roles if not role.is_default()],
        }

    async def sync_roles(self, guild: discord.Guild) -> None:
        roles = await guild.fetch_roles()
        payload = {
            "guildId": str(guild.id),
            "externalId": external_id("roles"),
            "roles": [
                {
                    "id": str(role.id),
                    "name": role.name,
                    "color": f"#{role.colour.value:06x}",
                    "position": role.position,
                    "managed": role.managed,
                }
                for role in roles
                if not role.is_default()
            ],
        }
        result = await self.api.post("/api/bot/discord/roles", payload)
        self.log.info(
            "Discord-Rollen synchronisiert: %s Rollen%s.",
            result.get("synced", len(payload["roles"])),
            " (Wiederholung erkannt)" if result.get("duplicate") else "",
        )

    async def sync_members(self, guild: discord.Guild, members: list[discord.Member], prefix: str) -> None:
        if not members:
            return
        for number, member_batch in enumerate(
            batches(members, self.config.sync.member_batch_size), start=1
        ):
            payload = {
                "guildId": str(guild.id),
                "externalId": external_id(f"{prefix}-{number}"),
                "members": [self.member_payload(member) for member in member_batch],
            }
            result = await self.api.post("/api/bot/discord/members", payload)
            self.log.info(
                "Mitgliederpaket %s synchronisiert: %s Mitglieder, %s Website-Konten verknuepft.",
                number,
                result.get("synced", len(member_batch)),
                result.get("linked", 0),
            )

    async def sync_single_member(self, member: discord.Member, *, removed: bool = False) -> None:
        payload = {
            "guildId": str(member.guild.id),
            "externalId": external_id("member-remove" if removed else "member-update"),
            "members": [self.member_payload(member, removed=removed)],
        }
        try:
            await self.api.post("/api/bot/discord/members", payload)
            self.log.info(
                "Mitglied %s (%s) %s.",
                member,
                member.id,
                "als entfernt synchronisiert" if removed else "aktualisiert",
            )
        except Exception as error:
            self.log.error("Mitglied %s konnte nicht synchronisiert werden: %s", member.id, error)

    async def full_sync(self) -> None:
        async with self.full_sync_lock:
            guild = self.configured_guild()
            if guild is None:
                self.log.error("Vollabgleich nicht moeglich: konfigurierter Discord-Server fehlt.")
                return
            self.log.info("Starte vollstaendigen Discord-Abgleich...")
            await self.sync_roles(guild)
            await guild.chunk(cache=True)
            members = list(guild.members)
            await self.sync_members(guild, members, "members-full")
            await self.send_heartbeat()
            self.log.info("Vollabgleich abgeschlossen: %s Mitglieder.", len(members))

    def schedule_role_sync(self, guild: discord.Guild) -> None:
        if guild.id != self.config.guild_id:
            return
        if self.role_sync_task and not self.role_sync_task.done():
            self.role_sync_task.cancel()
        self.role_sync_task = asyncio.create_task(self.delayed_role_sync(guild))

    async def delayed_role_sync(self, guild: discord.Guild) -> None:
        try:
            await asyncio.sleep(2)
            await self.sync_roles(guild)
        except asyncio.CancelledError:
            return
        except Exception as error:
            self.log.error("Discord-Rollen konnten nicht synchronisiert werden: %s", error)

    async def on_guild_role_create(self, role: discord.Role) -> None:
        self.schedule_role_sync(role.guild)

    async def on_guild_role_update(self, before: discord.Role, after: discord.Role) -> None:
        self.schedule_role_sync(after.guild)

    async def on_guild_role_delete(self, role: discord.Role) -> None:
        self.schedule_role_sync(role.guild)

    async def on_member_join(self, member: discord.Member) -> None:
        if member.guild.id == self.config.guild_id:
            await self.sync_single_member(member)

    async def on_member_update(self, before: discord.Member, after: discord.Member) -> None:
        if after.guild.id == self.config.guild_id:
            await self.sync_single_member(after)

    async def on_member_remove(self, member: discord.Member) -> None:
        if member.guild.id == self.config.guild_id:
            await self.sync_single_member(member, removed=True)

    async def execute_role_job(self, guild: discord.Guild, job: dict[str, Any]) -> dict[str, Any] | None:
        job_id = str(job.get("id", ""))
        discord_id = int(job.get("discordId", 0))
        role_id = int(job.get("discordRoleId", 0))
        operation = str(job.get("operation", ""))
        if not job_id or not discord_id or not role_id or operation not in {"ADD", "REMOVE"}:
            return {"id": job_id or "ungueltig", "success": False, "error": "Ungueltiger Rollenauftrag."}

        role = guild.get_role(role_id)
        if role is None:
            if operation == "REMOVE":
                return {"id": job_id, "success": True}
            return {"id": job_id, "success": False, "error": "Discord-Rolle wurde nicht gefunden."}

        member = guild.get_member(discord_id)
        if member is None:
            try:
                member = await guild.fetch_member(discord_id)
            except discord.NotFound:
                if operation == "REMOVE":
                    return {"id": job_id, "success": True}
                return {"id": job_id, "success": False, "error": "Mitglied ist nicht auf dem Discord-Server."}

        bot_member = guild.me
        if bot_member is None or not bot_member.guild_permissions.manage_roles:
            return {"id": job_id, "success": False, "error": "Dem Bot fehlt die Berechtigung Rollen verwalten."}
        if role >= bot_member.top_role:
            return {"id": job_id, "success": False, "error": "Die Zielrolle steht ueber oder gleichauf mit der Bot-Rolle."}
        if role.managed:
            return {"id": job_id, "success": False, "error": "Diese Discord-Rolle wird von einer Integration verwaltet."}

        try:
            if operation == "ADD":
                if role not in member.roles:
                    await member.add_roles(role, reason="DRP-Portal Rollenauftrag")
            elif role in member.roles:
                await member.remove_roles(role, reason="DRP-Portal Rollenauftrag")
            self.log.info(
                "Rollenauftrag %s erfolgreich: %s Rolle %s fuer %s (%s).",
                job_id,
                operation,
                role.name,
                member,
                member.id,
            )
            return {"id": job_id, "success": True}
        except discord.HTTPException as error:
            if error.status >= 500:
                self.log.warning(
                    "Discord-Serverfehler bei Auftrag %s; Auftrag wird spaeter erneut freigegeben: %s",
                    job_id,
                    error,
                )
                return None
            return {"id": job_id, "success": False, "error": str(error)[:1000]}
        except discord.DiscordException as error:
            return {"id": job_id, "success": False, "error": str(error)[:1000]}

    async def process_role_jobs(self) -> None:
        guild = self.configured_guild()
        if guild is None:
            return
        result = await self.api.get("/api/bot/discord/role-jobs")
        jobs = result.get("jobs")
        if not isinstance(jobs, list) or not jobs:
            return

        acknowledgements: list[dict[str, Any]] = []
        for job in jobs:
            if not isinstance(job, dict):
                continue
            acknowledgement = await self.execute_role_job(guild, job)
            if acknowledgement:
                acknowledgements.append(acknowledgement)

        if acknowledgements:
            response = await self.api.post(
                "/api/bot/discord/role-jobs", {"jobs": acknowledgements}
            )
            self.log.info(
                "%s von %s Rollenauftraegen bestaetigt.",
                response.get("updated", 0),
                len(acknowledgements),
            )

    @tasks.loop(seconds=20)
    async def role_jobs_loop(self) -> None:
        try:
            await self.process_role_jobs()
        except Exception as error:
            self.log.error("Rollenauftraege konnten nicht verarbeitet werden: %s", error)

    @role_jobs_loop.before_loop
    async def before_role_jobs_loop(self) -> None:
        await self.wait_until_ready()

    @tasks.loop(hours=6)
    async def full_sync_loop(self) -> None:
        try:
            await self.full_sync()
        except Exception as error:
            self.log.exception("Vollstaendiger Discord-Abgleich fehlgeschlagen: %s", error)

    @full_sync_loop.before_loop
    async def before_full_sync_loop(self) -> None:
        await self.wait_until_ready()

    @tasks.loop(minutes=5)
    async def heartbeat_loop(self) -> None:
        try:
            await self.send_heartbeat()
        except Exception as error:
            self.log.warning("Bot-Heartbeat konnte nicht gespeichert werden: %s", error)

    @heartbeat_loop.before_loop
    async def before_heartbeat_loop(self) -> None:
        await self.wait_until_ready()


def main() -> int:
    try:
        config = BotConfig.load()
        logger = configure_logging(config.logging)
    except Exception as error:
        print(f"Konfigurationsfehler: {error}", file=sys.stderr)
        return 2

    logger.info("Starte DRP Discord-Bot mit discord.py %s.", discord.__version__)
    bot = DrpDiscordBot(config, logger)
    try:
        bot.run(config.discord_token, log_handler=None)
    except discord.LoginFailure:
        logger.critical("Discord-Anmeldung fehlgeschlagen. discord_token in config.json erneuern.")
        return 3
    except KeyboardInterrupt:
        logger.info("Bot wurde manuell beendet.")
        return 0
    except Exception:
        logger.exception("Bot wurde durch einen unerwarteten Fehler beendet.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
