/* eslint-env mocha */
const assert = require("assert");
const app = require("../../src/app");
const request = require("superagent");
const SUCCESS_CODE = 200;

describe("Startup", ()=>{

  beforeEach(()=>{
    app.start();
  });

  afterEach(()=>{
    app.stop();
  });

  it("return success when reaching the server", (done)=>{

    request.get("http://localhost:8080/oauthtokenprovider/")
      .end((err, res) => {
        if (err) {
          console.log(err);
          assert(false);
        } else {
          assert.equal(res.status, SUCCESS_CODE);
          assert.equal(res.text, "OAuth Token Provider: unit-test-pod 1.0.0");
        }
        done();
      });
  });
});
