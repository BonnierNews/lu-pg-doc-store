"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const query = require("../../lib/query");
const helper = require("../../lib/testHelper");

Feature("Database status", () => {
  after(helper.tearDown);

  Scenario("Check status of underlying database", () => {
    before((done) => {
      helper.clearAndInit(done);
    });

    let error;
    When("status is checked", (done) => {
      query.getStatus((err) => {
        error = err;
        done();
      });
    });

    Then("there should not be any error", () => {
      should.equal(error, null);
    });
  });
});
