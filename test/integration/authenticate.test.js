/* eslint-env mocha */
const assert = require("assert");
const app = require("../../src/app");
const request = require("superagent");
const SUCCESS_CODE = 200;

describe("Authenticate", ()=>{

  beforeEach(()=>{
    app.start();
  });

  afterEach(()=>{
    app.stop();
  });

  it("return success and token when calling GET authenticate", (done)=>{

    request.get("http://localhost:8080/oauthtokenprovider/authenticate")
      .end((err, res) => {
        if (err) {
          console.log(err);
          assert(false);
        } else {
          assert.equal(res.status, SUCCESS_CODE);
          console.log(res.body);
          assert(res.body.token);
        }
        done();
      });
  });
});
