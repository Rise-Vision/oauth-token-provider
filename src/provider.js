const authenticator = require("./authenticator.js");
const db = require("./db.js")
const gcs = require("./gcs.js");
const {CLIENT_ERROR, SERVER_ERROR} = require("./status-codes.js");
const invalidInputError = new Error("Invalid input");

const validateAuthenticateBody = (req) => {
  const body = req.body;
  if (!body || !body.code || !body.provider || !body.companyId) {
    return Promise.reject(invalidInputError);
  }

  return Promise.resolve(req);
}

const validateStatusBody = (req) => {
  const body = req.body;
  if (!body || !body.companyId || !body.provider) {
    return Promise.reject(invalidInputError);
  }

  return Promise.resolve(req);
}

const validateRevokeBody = (req) => {
  const body = req.body;
  if (!body || !body.key) {
    return Promise.reject(invalidInputError);
  }

  return Promise.resolve(req);
}

const restoreFileCredentials = (companyId, provider, id) => {
  const key = `${companyId}:${provider}:${id}`;

  return db.getCredentials(key)
  .then(credentials => {
    if (!credentials) {
      throw new Error(`Could not read credentials for: ${key}`);
    }

    const data = {body: {companyId, provider}, credentials};

    return gcs.saveToGCS(data);
  });
}

const handleError = (res, error, errorMessage) => {
  console.log(errorMessage, error);
  res.status(error === invalidInputError ? CLIENT_ERROR : SERVER_ERROR);
  res.send(error.message);
}


const handleAuthenticatePostRequest = (req, res) => {
  validateAuthenticateBody(req)
  .then(authenticator.authenticate)
  .then(authenticator.handleAuthentication)
  .then(auth=>{
    return db.clearCredentials(auth)
    .then(() => db.saveToDB(auth));
  })
  .then(gcs.saveToGCS)
  .then((auth)=>{res.json({key: auth.key, authenticated: true})})
  .catch(error=>{
    handleError(res, error, "Error when authenticating");
  });
}

const handleAuthenticateGetRequest = (req, res) => {
  const token = authenticator.getToken(req.session);
  res.json({token});
}

const handleRevokeRequest = (req, res) => {
  validateRevokeBody(req)
  .then(db.deleteFromDB)
  .then(() => gcs.deleteFromGCS(req))
  .then(()=>{res.json({key: req.body.key, revoked: true})})
  .catch(error=>{
    handleError(res, error, "Error when revoking");
  });
}

const handleStatusRequest = (req, res) => {
  validateStatusBody(req)
  .then(db.checkKey)
  .then((exists)=>{res.json({authenticated: exists})})
  .catch(error=>{
    handleError(res, error, "Error when getting status");
  });
}

const handleRestoreFileCredentialsRequest = (req, res) => {
  validateStatusBody(req)
  .then(db.checkKey)
  .then(keys=>{
    const companyId = req.body.companyId;
    const provider = req.body.provider;

    if (!keys || keys.length === 0) {
      return res.json({
        success: false,
        message: `No credentials for: ${companyId}:${provider}`
      });
    }

    return restoreFileCredentials(companyId, provider, keys[0]);
  })
  .then(() => res.json({success: true}))
  .catch(error=>{
    handleError(res, error, "Error when restoring file credentials");
  });
}

module.exports = {
  handleAuthenticateGetRequest,
  handleAuthenticatePostRequest,
  handleRevokeRequest,
  handleStatusRequest,
  handleRestoreFileCredentialsRequest
}
