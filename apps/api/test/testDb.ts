import path from "node:path";
import { fileURLToPath } from "node:url";

/** The throwaway database. The name must end in _test: setup drops and recreates it. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://prayers4me:prayers4me@localhost:5432/prayers4me_test";

export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../infra/sql",
);
