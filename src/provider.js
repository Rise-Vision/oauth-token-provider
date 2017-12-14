const OAuth = require('oauthio');
const oauthioAppKey = process.env.OTP_OAUTHIO_APP_KEY;
const oauthioAppSecret = process.env.OTP_OAUTHIO_APP_SECRET;
OAuth.initialize(oauthioAppKey, oauthioAppSecret);

const handleAuthenticateGetRequest = (req, res) => {
  const token = OAuth.generateStateToken(req);
  res.json({token});
}

module.exports = {
  handleAuthenticateGetRequest
}
