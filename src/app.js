/* eslint max-params: 0 */
const express = require("express");
const http = require("http");
const pkg = require("../package.json");
const config = require("./config");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const port = process.env.OTP_PORT || config.defaultPort;
const sessionSecret = process.env.OTP_SESSION_SECRET || config.defaultSessionSecret;
const jwtSecret = process.env.JWT_SECRET || config.defaultJWTSecret;
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const jwt = require("express-jwt");
const app = express();
const server = http.createServer(app);
const podname = process.env.podname;
const redis = require("redis-promise");
const gkeHostname = "otp-redis-master";
const redisHost = process.env.NODE_ENV === "test" ? "127.0.0.1" : gkeHostname;
const provider = require("./provider");
const gapis = require("googleapis");
const oauth2 = gapis.google.oauth2("v2");
const {AUTH_ERROR} = require("./status-codes.js");

redis.initdb(null, redisHost);

// Google OAuth2 token verification
const checkAccessToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {return sendUnauthorized(res);}
  const items = authorization.split(/[ ]+/);
  if (items.length > 1 && items[0].trim() === "Bearer") {
    const accessToken = items[1];
    oauth2.tokeninfo({"access_token": accessToken}, (error)=>{
      if (error) {
        console.error(error);
        return sendUnauthorized(res);
      }
      next();
    });
  } else {
    return sendUnauthorized(res);
  }
}

const sendUnauthorized = (res) =>{
  res.status(AUTH_ERROR).send({message: "Authorization Required"});
}

// JWT authorization
app.use(jwt({
  secret: Buffer.from(jwtSecret, "base64"),
  credentialsRequired: true
}).unless({path: ["/oauthtokenprovider/"]}));

app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    checkAccessToken(req, res, next);
    return;
  }
 next();
});

// CORS allow every origin as it requires user authorization
app.use((req, res, next) => {
    if (req && req.headers && req.headers.origin) {console.log(`CORS origin: ${req.headers.origin}`);}
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

// Session
app.use(session({
    store: new RedisStore({client: redis.getClient()}),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true
}));


// Routers
app.get("/oauthtokenprovider", function(req, res) {
  res.send(`OAuth Token Provider: ${podname} ${pkg.version}`);
});

app.get("/oauthtokenprovider/authenticate", provider.handleAuthenticateGetRequest);

app.post("/oauthtokenprovider/authenticate", jsonParser, provider.handleAuthenticatePostRequest);

app.post("/oauthtokenprovider/revoke", jsonParser, provider.handleRevokeRequest);

app.post("/oauthtokenprovider/status", jsonParser, provider.handleStatusRequest);

// May be invoked manually to restore file credentials if they were lost on GCS
// but remain in the in-memory Redis structure
app.post("/oauthtokenprovider/restore_file_credentials", jsonParser, provider.handleRestoreFileCredentialsRequest);


// Server start and stop
const start = ()=>{
  server.listen(port, (err) => {
    if (err) {
      redis.close();
      return console.log("Error when starting OAuth Token Provider", err);
    }

    console.log(`server is listening on ${port}`);
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
