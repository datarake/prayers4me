import { ApiError } from "../errors.js";

/** Cheap first-pass filters against the scripture-dump / flood pattern. */
export function assertMessageLooksHuman(message: string): void {
  const normalized = message.replace(/\s+/g, " ").trim();
  const lines = message
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length >= 12) {
    throw new ApiError(
      400,
      "message_rejected",
      "Please share your own situation in a shorter message",
    );
  }

  // Very long unbroken paste often = dump of religious text
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  if (longestLine > 900) {
    throw new ApiError(
      400,
      "message_rejected",
      "Please rewrite this as your own short story",
    );
  }

  const urlCount = (normalized.match(/https?:\/\//gi) ?? []).length;
  if (urlCount >= 2) {
    throw new ApiError(
      400,
      "message_rejected",
      "Links are limited in prayer requests",
    );
  }
}
