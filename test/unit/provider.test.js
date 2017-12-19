/* eslint-env mocha */
/* eslint max-statements: ["error", 10, { "ignoreTopLevelFunctions": true }] */
const assert = require("assert");
const simple = require("simple-mock");
const provider = require("../../src/provider");
const OAuth = require('oauthio');
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
    accessToken: "dsadsa",
    refreshToken: "dashdsa"
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
    mock();
  });

  const mock = () => {

    simple.mock(OAuth, "initialize").returnWith(true);
    simple.mock(OAuth, "generateStateToken").returnWith("TOKEN");
    simple.mock(OAuth, "auth").resolveWith(authResult);
    simple.mock(authResult, "getCredentials").returnWith(credentials);
    simple.mock(redis, "increment").resolveWith(pk);
    simple.mock(redis, "setString").resolveWith();
    simple.mock(gcs, "saveToGCS").resolveWith(auth);
    simple.mock(gcs, "deleteFromGCS").resolveWith(req);
    simple.mock(redis, "deleteKey").resolveWith();
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

  describe(" Test Failures", ()=>{

    beforeEach(()=>{
      resPromise = new Promise(resolve=>{
        res = {send: resolve, status: () => {}};
      });

      req = {
        body: {
          code: "xxxxx",
          companyId: "xxxxx",
          provider: "twitter"
        }
      }
    });

    it("return failure when missing code", ()=>{

      req = {
        body: {
          companyId: "xxxxx",
          provider: "twitter"
        }
      }
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(body=>{
        assert.equal(body, "Invalid input");
      });
    });

    it("return failure when missing companyId", ()=>{

      req = {
        body: {
          code: "xxxx",
          provider: "twitter"
        }
      }
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(body=>{
        assert.equal(body, "Invalid input");
      });
    });

    it("return failure when missing provider", ()=>{

      req = {
        body: {
          code: "xxxx",
          companyId: "xxx"
        }
      }
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(body=>{
        assert.equal(body, "Invalid input");
      });
    });

    it("return failure for second step of authentication when cannot autehnticate with OAuth.io", ()=>{

      simple.mock(OAuth, "auth").rejectWith(new Error());
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(body=>{
        assert.equal(body, "Could not authenticate with OAuth.io: {}");
      });
    });

    it("return failure for second step of authentication when cannot save to DB because of redis increment", ()=>{

      simple.mock(redis, "increment").rejectWith(new Error());
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(body=>{
        assert.equal(body, "Could not save to DB: {}");
      });
    });

    it("return failure for second step of authentication when cannot save to DB because of redis add", ()=>{

      simple.mock(redis, "setString").throwWith(new Error());
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(body=>{
        assert.equal(body, "Could not save to DB: {}");
      });
    });

    it("return failure for second step of authentication when cannot save to GCS", ()=>{
      simple.mock(gcs, "saveToGCS").rejectWith(new Error("Could not save to GCS: {}"));
      provider.handleAuthenticatePostRequest(req, res);

      return resPromise.then(body=>{
        assert.equal(body, "Could not save to GCS: {}");
      });
    });

    describe(" Test Failures", ()=>{

      beforeEach(()=>{
        req = {
          body: {
            key
          }
        }
      });

      it("return failure for revoke when cannot delete from GCS", ()=>{
        simple.mock(gcs, "deleteFromGCS").rejectWith(new Error("Could not delete from GCS: {}"));
        provider.handleRevokeRequest(req, res);

        return resPromise.then(body=>{
          assert.equal(body, "Could not delete from GCS: {}");
        });
      });

      it("return failure for revoke when cannot delete from DB", ()=>{
        simple.mock(redis, "deleteKey").rejectWith(new Error("Could not delete from DB: {}"));
        provider.handleRevokeRequest(req, res);

        return resPromise.then(body=>{
          assert.equal(body, "Could not delete from DB: {}");
        });
      });
    });
  });
});
