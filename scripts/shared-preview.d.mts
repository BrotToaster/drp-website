import type { Server } from "node:http";

export function createPreviewProxy(config: {
  origin: string;
  username: string;
  password: string;
  upstreamPort?: number;
}): Server;
