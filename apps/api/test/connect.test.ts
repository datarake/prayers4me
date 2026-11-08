import { describe, expect, it } from "vitest";
import { connect } from "../src/db/client.js";

describe("database connection URL", () => {
  it("uses the unix socket named by a host query parameter (Cloud Run + Cloud SQL)", async () => {
    const sql = connect(
      "postgres://u:p@localhost/db?host=/cloudsql/proj:europe-west1:inst",
      { max: 1 },
    );
    expect(sql.options.path).toBe("/cloudsql/proj:europe-west1:inst/.s.PGSQL.5432");
    // Nothing from the URL may be forwarded to the server as a setting.
    expect(sql.options.connection).not.toHaveProperty("host");
    expect(sql.options.user).toBe("u");
    expect(sql.options.database).toBe("db");
    await sql.end({ timeout: 0 });
  });

  it("connects over TCP for an ordinary URL", async () => {
    const sql = connect("postgres://u:p@db.example.com:5433/app", { max: 1 });
    expect(sql.options.path).toBe(false);
    expect(sql.options.host).toEqual(["db.example.com"]);
    expect(sql.options.port).toEqual([5433]);
    await sql.end({ timeout: 0 });
  });
});
