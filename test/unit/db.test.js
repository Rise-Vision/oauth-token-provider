/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");
const db = require("../../src/db");
const redis = require("redis-promise");

describe("db", ()=>{

  beforeEach(()=>{
    simple.mock(redis, "deleteKey").resolveWith();
    simple.mock(redis, "setRemove").resolveWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("gets the credentials", ()=>{
    simple.mock(redis, "getSet").resolveWith(["10"]);

    return db.checkKey({ body: {
      companyId: "xxxyy",
      provider: "twitter"
    }}).then(keys => {
      assert.deepEqual(keys, ["10"]);

      assert.equal(redis.getSet.callCount, 1);
      assert.equal(redis.getSet.lastCall.args[0], "xxxyy:twitter");
    });
  });

  it("deletes a credential from database", ()=>{
    return db.deleteFromDB({ body: {
      key: "xxxyy:twitter:30"
    }}).then(() => {
      assert.equal(redis.deleteKey.callCount, 1);
      assert.equal(redis.deleteKey.lastCall.args[0], "xxxyy:twitter:30");

      assert.equal(redis.setRemove.callCount, 1);
      assert.equal(redis.setRemove.lastCall.args[0], "xxxyy:twitter");
      assert.deepEqual(redis.setRemove.lastCall.args[1], ["30"]);
    });
  });

  it("clears the credentials", ()=>{

    function isValidKey(key) {
      return ["10", "11", "12"].includes(key);
    }

    function isValidFullKey(key) {
      const parts = key.split(":");

      return parts[0] === "xxxyy" && parts[1] === "twitter" && isValidKey(parts[2]);
    }

    simple.mock(redis, "getSet").resolveWith(["10", "11", "12"]);

    return db.clearCredentials({ body: {
      companyId: "xxxyy",
      provider: "twitter"
    }}).then(() => {
      assert.equal(redis.getSet.callCount, 1);
      assert.equal(redis.getSet.lastCall.args[0], "xxxyy:twitter");

      assert.equal(redis.deleteKey.callCount, 3);
      console.log(redis.deleteKey.calls[0].args[0]);
      console.log(redis.deleteKey.calls[1].args[0]);
      console.log(redis.deleteKey.calls[2].args[0]);
      console.log("--------------------------------------");
      assert(isValidFullKey(redis.deleteKey.calls[0].args[0]));
      assert(isValidFullKey(redis.deleteKey.calls[1].args[0]));
      assert(isValidFullKey(redis.deleteKey.calls[2].args[0]));

      assert.equal(redis.setRemove.callCount, 3);
      assert.equal(redis.setRemove.calls[0].args[0], "xxxyy:twitter");
      assert(isValidKey(redis.setRemove.calls[0].args[1][0]));
      assert.equal(redis.setRemove.calls[1].args[0], "xxxyy:twitter");
      assert(isValidKey(redis.setRemove.calls[0].args[1][0]));
      assert.equal(redis.setRemove.calls[2].args[0], "xxxyy:twitter");
      assert(isValidKey(redis.setRemove.calls[0].args[1][0]));
    });
  });

  it("doesn't clear if there are not credentials", ()=>{
    simple.mock(redis, "getSet").resolveWith(null);

    return db.clearCredentials({ body: {
      companyId: "xxxyy",
      provider: "twitter"
    }}).then(() => {
      assert.equal(redis.getSet.callCount, 1);
      assert.equal(redis.getSet.lastCall.args[0], "xxxyy:twitter");

      assert.equal(redis.deleteKey.callCount, 0);
      assert.equal(redis.setRemove.callCount, 0);
    });
  });

  it("doesn't clear if there are errors retrieving the keys", ()=>{
    simple.mock(redis, "getSet").rejectWith(null);

    return db.clearCredentials({ body: {
      companyId: "xxxyy",
      provider: "twitter"
    }}).then(() => {
      assert.equal(redis.getSet.callCount, 1);
      assert.equal(redis.getSet.lastCall.args[0], "xxxyy:twitter");

      assert.equal(redis.deleteKey.callCount, 0);
      assert.equal(redis.setRemove.callCount, 0);
    });
  });

});
