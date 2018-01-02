"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const crud = require("../../lib/crud");
const uuid = require("uuid");
const helper = require("../../lib/testHelper");
const expect = require("chai").expect;

Feature("Entity", () => {

  const entity = {
    id: uuid.v4(),
    type: "person",
    attributes: {
      name: "J Doe"
    },
    meta: {
      correlationId: "testEvent1"
    }
  };

  let savedEntity;

  before((done) => {
    helper.clearAndInit(done);
  });

  Scenario("Save and load an entity", () => {

    Given("a new entity is saved", (done) => {
      crud.upsert(entity, done);
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
      savedEntity.meta.correlationId.should.equal(entity.meta.correlationId);
    });

    And("it should have no relationships", () => {
      expect(savedEntity.relationships).to.have.length(0);
    });
  });
});
