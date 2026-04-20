import type { ShareRecord } from "../types";

const SHARE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function safeTokenSeed() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  const random = Math.random().toString(36).slice(2);
  const timestamp = Date.now().toString(36);
  return `${timestamp}${random}`;
}

export function createShareToken() {
  return safeTokenSeed().slice(0, 16);
}

export function buildSharePath(token: string) {
  return `/shared/${token}`;
}

export function createShareRecord(userId: string, sessionId: string, resultId: string): ShareRecord {
  const token = createShareToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SHARE_TTL_MS).toISOString();

  return {
    token,
    userId,
    sessionId,
    resultId,
    status: "active",
    createdAt,
    expiresAt,
    urlPath: buildSharePath(token)
  };
}

export function isShareExpired(record: ShareRecord) {
  return record.status !== "active" || new Date(record.expiresAt).getTime() <= Date.now();
}
