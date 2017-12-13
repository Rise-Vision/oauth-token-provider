const express = require("express");
const http = require("http");
const pkg = require("../package.json");
/* const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();*/
const defaultPort = 80;
const port = process.env.OTP_PORT || defaultPort;
const app = express();
const server = http.createServer(app);
const podname = process.env.podname;
const redis = require("redis-promise");
const gkeHostname = "aot-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;

app.get('/oauthtokenprovider', function(req, res) {
  res.send(`OAuth Token Provider: ${podname} ${pkg.version}`);
});

const start = ()=>{
  server.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err);
    }

    console.log(`server is listening on ${port}`);

    redis.initdb(null, redisHost);
  })
}

const stop = ()=>{
  redis.close();
  server.close();
}

module.exports = {
  start,
  stop
}
