import { z } from "zod";
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  NAME_MAX_LENGTH,
  REPORT_REASONS,
} from "./constants.js";
export const languageSchema = z.enum(["en", "es", "fr", "ro", "uk", "ru"]);

export const createRequestSchema = z
  .object({
    language: languageSchema,
    displayName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    message: z.string().trim().min(MESSAGE_MIN_LENGTH).max(MESSAGE_MAX_LENGTH),
    contactable: z.boolean().default(false),
    phone: z.string().trim().max(40).optional().nullable(),
    email: z.string().trim().email().max(120).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.contactable) return;
    if (!data.phone && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter phone or email when contact is enabled",
        path: ["email"],
      });
    }
  });

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const feedQuerySchema = z.object({
  language: languageSchema,
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;

export const reportRequestSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional(),
});

export type ReportRequestInput = z.infer<typeof reportRequestSchema>;

export const prayerCountLabel = (count: number) => {
  if (count <= 0) return "nobody" as const;
  if (count === 1) return "one" as const;
  return "many" as const;
};
