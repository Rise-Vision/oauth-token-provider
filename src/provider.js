const OAuth = require('oauthio');
const oauthioAppKey = process.env.OTP_OAUTHIO_APP_KEY;
const oauthioAppSecret = process.env.OTP_OAUTHIO_APP_SECRET;
const redis = require("redis-promise");
const {CLIENT_ERROR, SERVER_ERROR} = require("./status-codes.js");
const gcs = require("./gcs.js");

OAuth.initialize(oauthioAppKey, oauthioAppSecret);

const validateAuthenticateBody = (req) => {
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
    const key = `${auth.body.companyId}:${auth.body.provider}:${pkValue}`;
    redis.setString(key, [JSON.stringify(auth.credentials)]);
    auth.key = key;
    return Promise.resolve(auth);
  }).catch(error=>{
    return Promise.reject(new Error(`Could not save to DB: ${JSON.stringify(error)}`));
  });
}

const deleteFromDB = (req) => {
  return redis.deleteKey(req.body.key);
}

const handleAuthenticatePostRequest = (req, res) => {
  validateAuthenticateBody(req)
  .then(authenticate)
  .then(handleAuthentication)
  .then(saveToDB)
  .then(gcs.saveToGCS)
  .then((auth)=>{res.json({key: auth.key, authenticated: true})})
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

const validateRevokeBody = (req) => {
  const body = req.body;
  if (!body || !body.key) {
    return Promise.reject(new Error("Invalid input"));
  }

  return Promise.resolve(req);
}

const handleRevokeRequest = (req, res) => {
  validateRevokeBody(req)
  .then(gcs.deleteFromGCS)
  .then(deleteFromDB)
  .then(()=>{res.json({key: req.body.key, revoked: true})})
  .catch(error=>{
    console.log("Error when revoking", error);
    res.status(error.message === "Invalid input" ? CLIENT_ERROR : SERVER_ERROR);
    res.send(error.message);
  });
}

module.exports = {
  handleAuthenticateGetRequest,
  handleAuthenticatePostRequest,
  handleRevokeRequest
}
