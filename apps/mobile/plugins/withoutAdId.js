/**
 * Stillflame shows no ads and does not use the advertising ID. Firebase Analytics adds the
 * permission anyway, which would force an "uses advertising ID" declaration on Google Play.
 * This removes it (and the related ad-services permissions) from the merged manifest, and tells
 * Firebase Analytics not to collect the ID, so the declaration can honestly say "No".
 */
const { withAndroidManifest } = require("expo/config-plugins");

const REMOVE = [
  "com.google.android.gms.permission.AD_ID",
  "android.permission.ACCESS_ADSERVICES_AD_ID",
  "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
  "android.permission.ACCESS_ADSERVICES_TOPICS",
];

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const perms = (manifest["uses-permission"] ??= []);
    for (const name of REMOVE) {
      const existing = perms.find((p) => p.$["android:name"] === name);
      if (existing) existing.$["tools:node"] = "remove";
      else perms.push({ $: { "android:name": name, "tools:node": "remove" } });
    }
    const app = manifest.application?.[0];
    if (app) {
      const meta = (app["meta-data"] ??= []);
      const key = "google_analytics_adid_collection_enabled";
      const found = meta.find((m) => m.$["android:name"] === key);
      if (found) found.$["android:value"] = "false";
      else meta.push({ $: { "android:name": key, "android:value": "false" } });
    }
    return cfg;
  });
