const OAuth = require('oauthio');
const oauthioAppKey = process.env.OTP_OAUTHIO_APP_KEY;
const oauthioAppSecret = process.env.OTP_OAUTHIO_APP_SECRET;
const redis = require("redis-promise");
const {CLIENT_ERROR, SERVER_ERROR} = require("./status-codes.js");
const gcs = require("./gcs.js");
const invalidImputError = new Error("Invalid input");

OAuth.initialize(oauthioAppKey, oauthioAppSecret);

const validateAuthenticateBody = (req) => {
  const body = req.body;
  if (!body || !body.code || !body.provider || !body.companyId) {
    return Promise.reject(invalidImputError);
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
    // add the pk to the company:provider index
    redis.setString(key, [JSON.stringify(auth.credentials)]).then(redis.setAdd(`${auth.body.companyId}:${auth.body.provider}`, [pkValue]));
    auth.key = key;
    return Promise.resolve(auth);
  }).catch(error=>{
    return Promise.reject(new Error(`Could not save to DB: ${JSON.stringify(error)}`));
  });
}

const deleteFromDB = (req) => {
  const keyInParts = req.body.key.split(":");
  // delete entry and remove to the companyId:provider index
  // eslint-disable-next-line no-magic-numbers
  return redis.deleteKey(req.body.key).then(redis.setRemove(`${keyInParts[0]}:${keyInParts[1]}`, [keyInParts[2]]));
}

const checkStatus = (req) => {
  return redis.getSet(`${req.body.companyId}:${req.body.provider}`);
}

const handleAuthenticatePostRequest = (req, res) => {
  validateAuthenticateBody(req)
  .then(authenticate)
  .then(handleAuthentication)
  .then(saveToDB)
  .then(gcs.saveToGCS)
  .then((auth)=>{res.json({key: auth.key, authenticated: true})})
  .catch(error=>{
    handleError(res, error, "Error when authenticating");
  });
}

const handleAuthenticateGetRequest = (req, res) => {
  const token = OAuth.generateStateToken(req.session);
  res.json({token});
}

const validateRevokeBody = (req) => {
  const body = req.body;
  if (!body || !body.key) {
    return Promise.reject(invalidImputError);
  }

  return Promise.resolve(req);
}

const handleRevokeRequest = (req, res) => {
  validateRevokeBody(req)
  .then(gcs.deleteFromGCS)
  .then(deleteFromDB)
  .then(()=>{res.json({key: req.body.key, revoked: true})})
  .catch(error=>{
    handleError(res, error, "Error when revoking");
  });
}

const validateStatusBody = (req) => {
  const body = req.body;
  if (!body || !body.companyId || !body.provider) {
    return Promise.reject(invalidImputError);
  }

  return Promise.resolve(req);
}

const handleStatusRequest = (req, res) => {
  validateStatusBody(req)
  .then(checkStatus)
  .then((exists)=>{res.json({authenticated: exists})})
  .catch(error=>{
    handleError(res, error, "Error when getting status");
  });
}

const handleError = (res, error, errorMessage) => {
  console.log(errorMessage, error);
  res.status(error === invalidImputError ? CLIENT_ERROR : SERVER_ERROR);
  res.send(error.message);
}

module.exports = {
  handleAuthenticateGetRequest,
  handleAuthenticatePostRequest,
  handleRevokeRequest,
  handleStatusRequest
}
