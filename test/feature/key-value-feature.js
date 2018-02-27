"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const keyValue = require("../../lib/key-value");
const helper = require("../../lib/testHelper");

Feature("Key value storage", () => {
  Scenario("set value of new key", () => {
    before((done) => {
      helper.clearAndInit(done);
    });

    When("data is set for key", (done) => {
      keyValue.set("some-key", {"some-data": 5}, done);
    });

    Then("it should be possible to get it", (done) => {
      keyValue.get("some-key", (err, doc) => {
        should.equal(err, null);
        should.equal(doc["some-data"], 5);
        done();
      });
    });
  });

  Scenario("set value of existing key", () => {
    before((done) => {
      helper.clearAndInit(done);
    });

    When("data is set for key", (done) => {
      keyValue.set("some-other-key", {"some-data": 5}, done);
    });

    And("data is set for that key again", (done) => {
      keyValue.set("some-other-key", {"some-data": 6}, done);
    });

    Then("it should be possible to get it", (done) => {
      keyValue.get("some-other-key", (err, doc) => {
        should.equal(err, null);
        should.equal(doc["some-data"], 6);
        done();
      });
    });
  });
});
