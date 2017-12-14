/* eslint-env mocha */
/* eslint max-statements: ["error", 10, { "ignoreTopLevelFunctions": true }] */
const assert = require("assert");
const simple = require("simple-mock");
const provider = require("../../src/provider");
const OAuth = require('oauthio');

describe("Provider", ()=>{
  let resPromise = null;
  let req = {};
  let res = {};

  beforeEach(()=>{
    req = {
    };

    resPromise = new Promise(resolve=>{
      res = {json: resolve};
    });
  });

  afterEach(()=>{
    simple.restore()
  });

  it("return success and a token", ()=>{

    simple.mock(OAuth, "initialize").returnWith(true);
    simple.mock(OAuth, "generateStateToken").returnWith("TOKEN");
    provider.handleAuthenticateGetRequest(req, res);

    return resPromise.then(body=>{
      assert.deepEqual(body, {token: "TOKEN"});
    });
  });
});
