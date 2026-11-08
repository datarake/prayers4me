/** Product brand */
export const APP_NAME = "Prayers4me";
export const APP_DOMAIN = "prayers4me.app";
export const APP_TAGLINE = "Someone prayed for you.";

/** Content limits */
export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 2000;
export const NAME_MAX_LENGTH = 80;

/** Moderation / anti-flood (the failure mode that killed v1) */
export const RATE_LIMITS = {
  /** New prayer requests per user per rolling 24h */
  createRequestPerDay: 3,
  /** Pray actions per user per rolling 24h */
  prayPerDay: 200,
  /** Reports per user per rolling 24h */
  reportPerDay: 20,
  /** Auto-hide a request after this many distinct reporters */
  autoHideReportThreshold: 3,
} as const;

export const REQUEST_STATUSES = ["active", "hidden", "removed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REPORT_REASONS = [
  "spam",
  "scripture_dump",
  "harassment",
  "off_topic",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
