const fs = require('node:fs');
const path = require('node:path');
const appJson = require('./app.json');

const localGoogleServicesPath = path.join(__dirname, 'google-services.json');
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (fs.existsSync(localGoogleServicesPath) ? './google-services.json' : undefined);

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  },
};
