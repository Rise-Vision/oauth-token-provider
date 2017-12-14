const express = require("express");
const http = require("http");
const pkg = require("../package.json");
/* const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();*/
const defaultPort = 80;
const port = process.env.OTP_PORT || defaultPort;
const sessionSecret = process.env.OTP_SESSION_SECRET || "RV OTP";
const session = require('express-session');
const app = express();
const server = http.createServer(app);
const podname = process.env.podname;
const redis = require("redis-promise");
const gkeHostname = "otp-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;
const provider = require("./provider");

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true
}));

app.get('/oauthtokenprovider', function(req, res) {
  res.send(`OAuth Token Provider: ${podname} ${pkg.version}`);
});

app.get('/oauthtokenprovider/authenticate', provider.handleAuthenticateGetRequest);

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
