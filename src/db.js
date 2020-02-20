const redis = require("redis-promise");

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
    return Promise.reject(new Error(`Could not save to DB: {companyId: ${auth.body.companyId}, provider: ${auth.body.provider}, error: ${JSON.stringify(error)}}`));
  });
}

const deleteCredentials = (key) => {
  const keyInParts = key.split(":");

  // delete entry and remove to the companyId:provider index
  // eslint-disable-next-line no-magic-numbers
  return redis.deleteKey(key).then(redis.setRemove(`${keyInParts[0]}:${keyInParts[1]}`, [keyInParts[2]]));
}

const deleteFromDB = (req) => {
  return deleteCredentials(req.body.key);
}

const checkKey = (req) => {
  return redis.getSet(`${req.body.companyId}:${req.body.provider}`);
}

const clearCredentials = (req) => {
  const prefix = `${req.body.companyId}:${req.body.provider}`;

  return checkKey(req).then(keys => {
    if (!keys || keys.length === 0) {
      return;
    }

    return Promise.all(keys.map(key => deleteCredentials(`${prefix}:${key}`)));
  }).catch(() => Promise.resolve(req));
}

const getCredentials = key => {
  return redis.getString(key)
  .then(stringCredentials => JSON.parse(stringCredentials));
}

module.exports = {
  saveToDB,
  deleteFromDB,
  checkKey,
  clearCredentials,
  getCredentials
}
