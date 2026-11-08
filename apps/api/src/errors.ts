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

  // Safety nets for client mistakes that slip past explicit checks, so they never look
  // like server failures: a body that is not JSON, and a malformed id reaching Postgres.
  if (err instanceof SyntaxError) {
    return c.json(
      { error: { code: "invalid_json", message: "The request body is not valid JSON" } },
      400,
    );
  }
  if ((err as { code?: string } | null)?.code === "22P02") {
    return c.json(
      { error: { code: "invalid_input", message: "A value in the request is not valid" } },
      400,
    );
  }

  console.error(err);
  return c.json(
    { error: { code: "internal", message: "Unexpected server error" } },
    500,
  );
}
