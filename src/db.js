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

const deleteFromDB = (req) => {
  const keyInParts = req.body.key.split(":");
  // delete entry and remove to the companyId:provider index
  // eslint-disable-next-line no-magic-numbers
  return redis.deleteKey(req.body.key).then(redis.setRemove(`${keyInParts[0]}:${keyInParts[1]}`, [keyInParts[2]]));
}

const checkKey = (req) => {
  return redis.getSet(`${req.body.companyId}:${req.body.provider}`);
}

module.exports = {
  saveToDB,
  deleteFromDB,
  checkKey
}
