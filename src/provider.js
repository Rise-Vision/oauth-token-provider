const OAuth = require('oauthio');
const oauthioAppKey = process.env.OTP_OAUTHIO_APP_KEY;
const oauthioAppSecret = process.env.OTP_OAUTHIO_APP_SECRET;
const redis = require("redis-promise");
const {CLIENT_ERROR, SERVER_ERROR} = require("./status-codes.js");
const gcs = require("./gcs.js");

OAuth.initialize(oauthioAppKey, oauthioAppSecret);

const validateBody = (req) => {
  const body = req.body;
  if (!body || !body.code || !body.provider || !body.companyId) {
    return Promise.reject(new Error("Invalid input"));
  }

  return Promise.resolve(req);
}

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

const saveToDB = (auth) => {
  const pkKey = "credentials:pk";
  return redis.increment(pkKey)
  .then(pkValue=>{
    redis.setAdd(`${auth.body.companyId}:${auth.body.provider}:${pkValue}`, [JSON.stringify(auth.credentials)]);
    return Promise.resolve(auth);
  }).catch(error=>{
    return Promise.reject(new Error(`Could not save to DB: ${JSON.stringify(error)}`));
  });
}

const handleAuthenticatePostRequest = (req, res) => {
  validateBody(req)
  .then(authenticate)
  .then(handleAuthentication)
  .then(saveToDB)
  .then(gcs.saveToGCS)
  .then(()=>{res.json({authenticated: true})})
  .catch(error=>{
    console.log("Error when authenticating", error);
    res.status(error.message === "Invalid input" ? CLIENT_ERROR : SERVER_ERROR);
    res.send(error.message);
  });
}

const handleAuthenticateGetRequest = (req, res) => {
  const token = OAuth.generateStateToken(req.session);
  res.json({token});
}

module.exports = {
  handleAuthenticateGetRequest,
  handleAuthenticatePostRequest
}
