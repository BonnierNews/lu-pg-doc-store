import keyValue from "../../lib/key-value.js";
import helper from "../../lib/testHelper.js";

Feature("Key value storage", () => {
  after(helper.tearDown);

  Scenario("set value of new key", () => {
    before(helper.clearAndInit);

    When("data is set for key", (done) => {
      keyValue.set("some-key", { "some-data": 5 }, done);
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
      keyValue.set("some-other-key", { "some-data": 5 }, done);
    });

    And("data is set for that key again", (done) => {
      keyValue.set("some-other-key", { "some-data": 6 }, done);
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
