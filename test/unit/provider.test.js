/* eslint-env mocha */
/* eslint max-statements: ["error", 10, { "ignoreTopLevelFunctions": true }] */
/* eslint camelcase: ["error", {properties: "never"}]*/

const assert = require("assert");
const simple = require("simple-mock");
const provider = require("../../src/provider");
const OAuth = require("oauthio");
const redis = require("redis-promise");
const gcs = require("../../src/gcs.js");

describe("Provider", ()=>{
  let resPromise = null;
  let req = {};
  let res = {};
  const authResult = {
    getCredentials: ()=>{}
  };

  const credentials = {
    oauth_token: "dsadsa",
    oauth_token_secret: "dashdsa"
  }
  const pk = 10;
  const key = "xxxx:xxxx:1";

  const auth = {
    key
  }

  beforeEach(()=>{
    req = {
      body: {
        key
      }
    };

    resPromise = new Promise(resolve=>{
      res = {json: resolve, status: () => {}};
    });
    mockOauth();
    mockRedis();
  });

  const mockOauth = () => {
    simple.mock(OAuth, "initialize").returnWith(true);
    simple.mock(OAuth, "generateStateToken").returnWith("TOKEN");
    simple.mock(OAuth, "auth").resolveWith(authResult);
    simple.mock(authResult, "getCredentials").returnWith(credentials);
    simple.mock(gcs, "saveToGCS").resolveWith(auth);
    simple.mock(gcs, "deleteFromGCS").resolveWith(req);
  }

  const mockRedis = () => {
    simple.mock(redis, "increment").resolveWith(pk);
    simple.mock(redis, "setString").resolveWith();
    simple.mock(redis, "setAdd").resolveWith();
    simple.mock(redis, "deleteKey").resolveWith();
    simple.mock(redis, "getSet").resolveWith(["10"]);
    simple.mock(redis, "setRemove").resolveWith();
  }

  afterEach(()=>{
    simple.restore()
  });

  it("return success and a token", ()=>{
    provider.handleAuthenticateGetRequest(req, res);

    return resPromise.then(body=>{
      assert.deepEqual(body, {token: "TOKEN"});
    });
  });

  it("return success for second step of authentication", ()=>{

    req = {
      body: {
        code: "xxxxx",
        companyId: "xxxxx",
        provider: "twitter"
      }
    }
    provider.handleAuthenticatePostRequest(req, res);

    return resPromise.then(body=>{
      assert.deepEqual(body, {key, authenticated: true});
    });
  });

  it("should revoke the authentication", ()=>{
    provider.handleRevokeRequest(req, res);

    return resPromise.then(body=>{
      assert.deepEqual(body, {key, revoked: true});
    });
  });

  it("should return status authenticated for key", ()=>{
    req = {
      body: {
        companyId: "xxxxx",
        provider: "xxxxx"
      }
    };
    provider.handleStatusRequest(req, res);

    return resPromise.then(body=>{
      assert.deepEqual(body, {authenticated: ["10"]});
    });
  });

  it("should return status authenticated for no key", ()=>{
    simple.mock(redis, "getSet").resolveWith([]);
    req = {
      body: {
        companyId: "xxxxx",
        provider: "xxxxx"
      }
    };
    provider.handleStatusRequest(req, res);

    return resPromise.then(body=>{
      assert.deepEqual(body, {authenticated: []});
    });
  });

  describe("Clear credentials", () => {

    beforeEach(()=>{
      req = {
        body: {
          code: "xxxxx",
          companyId: "xxxxx",
          provider: "twitter"
        }
      }
    });

    it("clears credentials before adding new", ()=>{
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(()=>{
        assert.equal(redis.getSet.callCount, 1);
        assert.equal(redis.getSet.lastCall.args[0], "xxxxx:twitter");

        assert.equal(redis.deleteKey.callCount, 1);
        assert.equal(redis.deleteKey.lastCall.args[0], "xxxxx:twitter:10");

        assert.equal(redis.setRemove.callCount, 1);
        assert.equal(redis.setRemove.lastCall.args[0], "xxxxx:twitter");
        assert.equal(redis.setRemove.lastCall.args[1], "10");
      });
    });

    it("does not clear credentials if there are no previous keys", ()=>{
      simple.mock(redis, "getSet").resolveWith([]);

      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(()=>{
        assert.equal(redis.getSet.callCount, 1);
        assert.equal(redis.getSet.lastCall.args[0], "xxxxx:twitter");

        assert.equal(redis.deleteKey.callCount, 0);
        assert.equal(redis.setRemove.callCount, 0);
      });
    });

  });

  describe("Restore file credentials", () => {

    beforeEach(()=>{
      simple.mock(redis, "getString").resolveWith('{"value": 1}');

      req = {
        body: {
          companyId: "xxxxx",
          provider: "yyyyy"
        }
      }
    });

    it("should restore file credentials", () => {
      provider.handleRestoreFileCredentialsRequest(req, res);

      return resPromise.then(body=>{
        assert.deepEqual(body, {success: true});

        assert.equal(redis.getString.callCount, 1);
        assert.equal(redis.getString.lastCall.args[0], "xxxxx:yyyyy:10");

        assert.equal(gcs.saveToGCS.callCount, 1);
        assert.deepEqual(gcs.saveToGCS.lastCall.args[0], {
          body: {companyId: "xxxxx", provider: "yyyyy"},
          credentials: {value: 1}
        });
      });
    });

    it("should not restore file credentials if the database has none for that company", () => {
      simple.mock(redis, "getSet").resolveWith([]);

      provider.handleRestoreFileCredentialsRequest(req, res);

      return resPromise.then(body=>{
        assert.deepEqual(body, {
          success: false,
          message: "No credentials for: xxxxx:yyyyy"
        });

        assert.equal(redis.getString.callCount, 0);
        assert.equal(gcs.saveToGCS.callCount, 0);
      });
    });
  });

});
