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

  Scenario("Save and load an entity", () => {

    before((done) => {
      helper.clearAndInit(done);
    });

    let savedEntity;

    Given("a new entity is saved", (done) => {
      crud.upsert(entity, done);
    });

    When("we load it", (done) => {
      crud.load(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        savedEntity = dbEntity;
        return done();
      });
    });

    Then("it should have the same data", () => {
      savedEntity.id.should.equal(entity.id);
      savedEntity.type.should.equal(entity.type);
      savedEntity.attributes.name.should.equal(entity.attributes.name);
    });
  });

  Scenario("Save, remove and try to load", () => {

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      crud.upsert(entity, done);
    });

    When("we delete it", (done) => {
      crud.remove(entity.id, done);
    });

    Then("it should not be possible to load without force", (done) => {
      crud.load(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        should.equal(dbEntity, null);
        return done();
      });
    });
  });

  Scenario("Save, remove and forcefully load an entity", () => {
    let savedEntity;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      crud.upsert(entity, done);
    });

    When("we delete it", (done) => {
      crud.remove(entity.id, (err) => {
        if (err) return done(err);
        return done();
      });
    });

    Then("we load it with force", (done) => {
      crud.load(entity.id, true, (err, dbEntity) => {
        if (err) return done(err);
        savedEntity = dbEntity;
        return done();
      });
    });

    And("it should have the same data", () => {
      savedEntity.id.should.equal(entity.id);
      savedEntity.type.should.equal(entity.type);
      savedEntity.attributes.name.should.equal(entity.attributes.name);
    });
  });

  Scenario("Save, remove and try to update an entity", () => {

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      crud.upsert(entity, done);
    });

    And("we delete it", (done) => {
      crud.remove(entity.id, (err) => {
        if (err) return done(err);
        return done();
      });
    });

    Then("it should not be possible to update the entity", (done) => {
      crud.upsert(entity, (err, res) => {
        should.not.equal(err, null);
        should.equal(res, null);
        done();
      });
    });
  });
});
