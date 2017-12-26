const express = require("express");
const http = require("http");
const pkg = require("../package.json");
const config = require("./config");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const port = process.env.OTP_PORT || config.defaultPort;
const sessionSecret = process.env.OTP_SESSION_SECRET || config.defaultSessionSecret;
const jwtSecret = process.env.JWT_SECRET || config.defaultJWTSecret;
const session = require('express-session');
const jwt = require('express-jwt');
const app = express();
const server = http.createServer(app);
const podname = process.env.podname;
const redis = require("redis-promise");
const gkeHostname = "otp-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;
const provider = require("./provider");
const google = require('googleapis');
const oauth2 = google.oauth2("v2");
const {AUTH_ERROR} = require("./status-codes.js");


// Google OAuth2 token verification
const checkAccessToken = (req, res, next) => {
  const authorization = req.headers["authorization"];
  const items = authorization.split(/[ ]+/);

  if (items.length > 1 && items[0].trim() == "Bearer") {
    const access_token = items[1];
    oauth2.tokeninfo({ access_token }, (error, response)=>{
      if(error) {
        res.status(AUTH_ERROR).send({message: "Authorization Required"});
        return;
      }
      next();
    });
  }
}

// JWT authorization
app.use(jwt({
  secret: new Buffer(jwtSecret, 'base64'),
  credentialsRequired: true
}));

app.use((err, req, res, next) => {
  if(err.name === 'UnauthorizedError') {
    checkAccessToken(req, res, next);
    return;
  }
 next();
});

// CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

const cookieSecurity = Reflect.has(process.env, "COOKIE_SECURITY") ? process.env.COOKIE_SECURITY === "true" : true;

// Session
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


// Routers
app.get('/oauthtokenprovider', function(req, res) {
  res.send(`OAuth Token Provider: ${podname} ${pkg.version}`);
});

app.get('/oauthtokenprovider/authenticate', provider.handleAuthenticateGetRequest);

app.post('/oauthtokenprovider/authenticate', jsonParser, provider.handleAuthenticatePostRequest);

app.post('/oauthtokenprovider/revoke', jsonParser, provider.handleRevokeRequest);

app.post('/oauthtokenprovider/status', jsonParser, provider.handleStatusRequest);


// Server start and stop
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
