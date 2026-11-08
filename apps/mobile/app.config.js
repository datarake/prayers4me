/**
 * Extends app.json. The Firebase config files hold project identifiers rather than secrets,
 * but they stay out of git (see .gitignore). Locally they live in ./firebase. For cloud builds
 * (EAS), upload them as file secrets and point these variables at them.
 */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_PLIST ?? config.ios?.googleServicesFile,
  },
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
