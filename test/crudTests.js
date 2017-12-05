"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const assert = require("assert");
const crud = require("../lib/crud");
const uuid = require("uuid");
const helper = require("../lib/testHelper");

Feature("CRUD", () => {

  const entity = {
    id: uuid.v4(),
    type: "person",
    attributes: {
      name: "J Doe"
    }
  };

  before((done) => {
    helper.clearAndInit(done);
  });

  Scenario("Store entity", () => {
    When("We store an entity", (done) => {
      crud.upsert(entity.id, entity.type, entity.attributes, done);
    });
    Then("It should be retrievable", () => {
      crud.load(entity.id, (err, dbEntity) => {
        if (err) done(err);
        assert.equal(dbEntity.id, entity.id);
        assert.equal(dbEntity.type, entity.type);
        assert.equal(dbEntity.attributes.name, entity.attributes.name);
        done();
      });
    });
  });
});
