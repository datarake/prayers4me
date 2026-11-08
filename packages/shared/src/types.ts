import type { LanguageCode } from "./languages.js";
import type { ReportReason, RequestStatus } from "./constants.js";

export type UserPublic = {
  id: string;
  language: LanguageCode;
  createdAt: string;
};

export type PrayerRequestPublic = {
  id: string;
  language: LanguageCode;
  displayName: string;
  message: string;
  prayersCount: number;
  prayedByMe: boolean;
  isMine: boolean;
  contactable: boolean;
  phone: string | null;
  email: string | null;
  status: RequestStatus;
  createdAt: string;
};

export type FeedPage = {
  items: PrayerRequestPublic[];
  nextCursor: string | null;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type ReportCreated = {
  id: string;
  requestId: string;
  reason: ReportReason;
  autoHidden: boolean;
};
