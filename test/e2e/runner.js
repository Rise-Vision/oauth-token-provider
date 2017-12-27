const {spawn} = require('child_process');
let redisServer = null;
let oauthTokenProvider = null;
let testApp = null;

console.log("Starting suite-level redis server");
redisServer = spawn("redis-server", {stdio: 'inherit'});
redisServer.on('error', function (err) {
  throw err
})

console.log("Starting suite-level OAuth Token Provider");
oauthTokenProvider = spawn("node", ["./index.js"], {stdio: 'inherit'});
oauthTokenProvider.on('error', function (err) {
  throw err
})

console.log("Starting suite-level Test App");
testApp = spawn("node", ["./test/e2e/test-app/index.js"], {stdio: 'inherit'});
testApp.on('error', function (err) {
  throw err
})

const runner = spawn('./node_modules/.bin/nightwatch', ["--config", "test/e2e/nightwatch.conf.js", "--env", "chrome"], {stdio: 'inherit'})

runner.on('close', function (code) {
  killServices();
  process.exit(code)
})

runner.on('error', function (err) {
  killServices();
  throw err
})

const killServices = () => {
  redisServer.kill();
  oauthTokenProvider.kill();
  testApp.kill();
}
