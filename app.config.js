const base = require('./app.json');

module.exports = ({ config }) => {
  const expo = { ...base.expo, ...config };

  expo.ios = {
    ...base.expo.ios,
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || base.expo.ios.googleServicesFile,
  };

  expo.android = {
    ...base.expo.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || base.expo.android.googleServicesFile,
  };

  return expo;
};
