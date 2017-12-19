const express = require("express");
const http = require("http");
const pkg = require("../package.json");
const config = require("./config");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const port = process.env.OTP_PORT || config.defaultPort;
const sessionSecret = process.env.OTP_SESSION_SECRET || config.defaultSessionSecret;
const session = require('express-session');
const app = express();
const server = http.createServer(app);
const podname = process.env.podname;
const redis = require("redis-promise");
const gkeHostname = "otp-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;
const provider = require("./provider");

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

const cookieSecurity = Reflect.has(process.env, "COOKIE_SECURITY") ? process.env.COOKIE_SECURITY === "true" : true;

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        sameSite: false,
        path: '/',
        httpOnly: false,
        secure: cookieSecurity,
        maxAge: config.cookieMaxAge
    }
}));

app.get('/oauthtokenprovider', function(req, res) {
  res.send(`OAuth Token Provider: ${podname} ${pkg.version}`);
});

app.get('/oauthtokenprovider/authenticate', provider.handleAuthenticateGetRequest);

app.post('/oauthtokenprovider/authenticate', jsonParser, provider.handleAuthenticatePostRequest);

app.post('/oauthtokenprovider/revoke', jsonParser, provider.handleRevokeRequest);

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
