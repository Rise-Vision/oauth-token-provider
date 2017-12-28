const config = require("./config");
const storage = require("@google-cloud/storage")({
  projectId: config.projectId
});

const bucket = storage.bucket(config.bucket);

const getFileName = (companyId, provider) => {
  return `${companyId}/credentials/${provider}.txt`;
}

const saveToGCS = (auth) => {
  return new Promise((resolve, reject) => {
    const fileName = getFileName(auth.body.companyId, auth.body.provider);

    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: "text/plain"
      }
    });

    stream.on('error', (error) => {
      reject(new Error(`Could not save to GCS: {companyId: ${auth.body.companyId}, provider: ${auth.body.provider}, error: ${JSON.stringify(error)}}`));
    });

    stream.on('finish', () => {
      resolve(auth);
    });

    stream.end(JSON.stringify(auth.credentials));
  });
}

const deleteFromGCS = (req) => {
  // key contain company id, provider and a pk
  const keyInParts = req.body.key.split(":");
  const fileName = getFileName(keyInParts[0], keyInParts[1]);
  const file = bucket.file(fileName);

  return file.delete().then(() => {
    return Promise.resolve(req);
  }).catch(error =>{
    return Promise.reject(new Error(`Could not delete from GCS: {companyId: ${keyInParts[0]}, provider: ${keyInParts[1]}, error: ${JSON.stringify(error)}}`));
  });
}

module.exports = {
  saveToGCS,
  deleteFromGCS
}
