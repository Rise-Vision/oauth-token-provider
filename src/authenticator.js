const OAuth = require('oauthio');
const oauthioAppKey = process.env.OTP_OAUTHIO_APP_KEY;
const oauthioAppSecret = process.env.OTP_OAUTHIO_APP_SECRET;

OAuth.initialize(oauthioAppKey, oauthioAppSecret);

const authenticate = (req) => {
  return OAuth.auth(req.body.provider, req.session, {
    code: req.body.code
  }).then(oauthResult=>{
    return Promise.resolve({oauthResult, body: req.body});
  }).catch(error=>{
    return Promise.reject(new Error(`Could not authenticate with OAuth.io: ${JSON.stringify(error)}`));
  });
}

const handleAuthentication = (auth) => {
  const credentials = auth.oauthResult.getCredentials();
  return Promise.resolve({credentials, body: auth.body});
}

const getToken = (session) => {
  return OAuth.generateStateToken(session);
}

module.exports = {
  authenticate,
  handleAuthentication,
  getToken
}
