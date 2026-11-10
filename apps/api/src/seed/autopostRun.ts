import { connect } from "../db/client.js";
import { runAutopost, warmRecentSeeds } from "./autopost.js";

/** One run of the scheduled poster, for Cloud Scheduler to start every half hour. */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const sql = connect(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    const posted = await runAutopost(sql);
    const warmed = await warmRecentSeeds(sql);
    console.log(`autopost: posted ${JSON.stringify(posted)}, warmed ${warmed}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
