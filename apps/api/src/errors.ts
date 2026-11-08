import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(c: Context, err: unknown) {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message } },
      err.status,
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: err.issues[0]?.message ?? "Invalid request",
        },
      },
      400,
    );
  }

  console.error(err);
  return c.json(
    { error: { code: "internal", message: "Unexpected server error" } },
    500,
  );
}
