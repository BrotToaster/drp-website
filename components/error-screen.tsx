"use client";

import Link from "next/link";
import { commonErrors, type CommonErrorCode } from "@/lib/common-errors";
import styles from "./error-screen.module.css";

export function ErrorScreen({ code = "500", retry, digest, information = false }: { code?: CommonErrorCode; retry?: () => void; digest?: string; information?: boolean }) {
  const content = commonErrors[code];
  const reference = digest && /^[a-zA-Z0-9_-]{1,80}$/.test(digest) ? digest : null;
  return <section className={styles.screen} aria-labelledby="error-title">
    <div className={styles.inner}>
      <Link href="/" className={styles.brand}>DRP <span>Deutschland Roleplay</span></Link>
      <div className={styles.layout}>
        <span className={styles.code} aria-label={code === "offline" ? "Keine Internetverbindung" : `Fehler ${code}`}>{code === "offline" ? "Offline" : code}</span>
        <div><h1 id="error-title">{content.title}</h1><p className={styles.message}>{content.message}</p>
          <div className={styles.actions}>{retry && <button type="button" onClick={retry}>Erneut versuchen</button>}<Link href={content.href} className={retry ? styles.secondary : undefined}>{content.action}</Link><Link href="/kontakt" className={styles.textLink}>Kontakt zum Team</Link></div>
          {reference && <p className={styles.note}>Fehlerkennung für den Support: <code>{reference}</code></p>}
          {information && <p className={styles.note}>Fehlerhilfe: Diese Seite erklärt die Meldung. Sie löst keinen Fehler und keinen Vorgang aus.</p>}
        </div>
      </div>
    </div>
  </section>;
}
