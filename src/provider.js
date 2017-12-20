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

const handleError = (res, error, errorMessage) => {
  console.log(errorMessage, error);
  res.status(error === invalidInputError ? CLIENT_ERROR : SERVER_ERROR);
  res.send(error.message);
}


const handleAuthenticatePostRequest = (req, res) => {
  validateAuthenticateBody(req)
  .then(authenticator.authenticate)
  .then(authenticator.handleAuthentication)
  .then(db.saveToDB)
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
  .then(gcs.deleteFromGCS)
  .then(db.deleteFromDB)
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

module.exports = {
  handleAuthenticateGetRequest,
  handleAuthenticatePostRequest,
  handleRevokeRequest,
  handleStatusRequest
}
