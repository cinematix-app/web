const withSass = require('@zeit/next-sass');
const withOffline = require('next-offline');

module.exports = withSass(withOffline({
  env: {
    // Pass dev mode to the client.
    DEV: process.env.NODE_ENV !== 'production',
  },
  dontAutoRegisterSw: true,
}));
