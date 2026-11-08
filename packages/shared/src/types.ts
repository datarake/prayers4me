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
  /** Set once the author has edited the text, so readers can tell it changed. */
  editedAt: string | null;
  /** Edits the author has left. Always 0 for other people's requests. */
  editsLeft: number;
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
