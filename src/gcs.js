const config = require("./config");
const storage = require("@google-cloud/storage")({
  projectId: config.projectId
});

const bucket = storage.bucket(config.bucket);

const saveToGCS = (auth) => {
  return new Promise((resolve, reject) => {
    const gcsname = `${auth.body.companyId}/credentials/${auth.body.provider}.txt`;

    const file = bucket.file(gcsname);

    const stream = file.createWriteStream({
      metadata: {
        contentType: "text/plain"
      }
    });

    stream.on('error', (err) => {
      console.log("Could not save to GCS", err);
      reject(new Error(`Could not save to GCS: ${JSON.stringify(err)}`));
    });

    stream.on('finish', () => {
      resolve(auth.body);
    });

    stream.end(JSON.stringify(auth.credentials));
  });
}

module.exports = {
  saveToGCS
}
