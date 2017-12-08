"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const crud = require("../../lib/crud");
const uuid = require("uuid");
const helper = require("../../lib/testHelper");

Feature("Entity", () => {

  const entity = {
    id: uuid.v4(),
    type: "person",
    attributes: {
      name: "J Doe"
    }
  };

  let savedEntity;

  before((done) => {
    helper.clearAndInit(done);
  });

  Scenario("Save and load an entitiy", () => {

    Given("a new entity is saved", (done) => {
      crud.upsert(entity.id, entity.type, entity.attributes, done);
    });

    When("we load it", (done) => {
      crud.load(entity.id, (err, dbEntity) => {
        if (err) done(err);
        savedEntity = dbEntity;
        done();
      });
    });

    Then("it should have the same data", () => {
      savedEntity.id.should.equal(entity.id);
      savedEntity.type.should.equal(entity.type);
      savedEntity.attributes.name.should.equal(entity.attributes.name);
    });
  });
});
