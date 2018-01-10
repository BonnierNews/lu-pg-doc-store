"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const crud = require("../../lib/crud");
const uuid = require("uuid");
const helper = require("../../lib/testHelper");

Feature("Version", () => {

  const attributes = [
    { name: "J Doe 1" },
    { name: "J Doe 2" },
    { name: "J Doe 3" }
  ];

  const entity = {
    id: uuid.v4(),
    type: "person"
  };

  const correlationIds = ["x", "y"];

  Scenario("Save and load multiple versions of an entity", () => {

    let entityVersions;
    let versionNrTwoId;
    let versionNrTwo;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      entity.attributes = attributes[0];
      crud.upsert(entity, done);
    });

    And("a new version is added to the entity", (done) => {
      entity.attributes = attributes[1];
      entity.meta = { correlationId: correlationIds[0] };
      crud.upsert(entity, done);
    });

    And("another version is added", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[1] };
      crud.upsert(entity, done);
    });

    When("we get all the versions", (done) => {
      crud.listVersions(entity.id, (err, dbEntity) => {
        if (err) done(err);
        entityVersions = dbEntity;
        done();
      });
    });

    Then("it should return all added versions", () => {
      entityVersions.should.have.lengthOf(3);
      entityVersions[1].correlationId.should.equal(correlationIds[0]);
    });

    Given("the returned version id of the second version", () => {
      versionNrTwoId = entityVersions[1].versionId;
    });

    When("we fetch the second version", (done) => {
      crud.loadVersion(versionNrTwoId, (err, dbEntity) => {
        if (err) done(err);
        versionNrTwo = dbEntity;
        done();
      });
    });

    Then("it should have the attributes that was saved in that version", () => {
      versionNrTwo.versionId.should.equal(versionNrTwoId);
      versionNrTwo.entity.attributes.should.eql(attributes[1]);
      versionNrTwo.correlationId.should.eql(correlationIds[0]);
    });
  });

  Scenario("Save multiple versions of an entity, remove the entity and try to list and load the versions", () => {

    let versionNr;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      entity.attributes = attributes[0];
      crud.upsert(entity, done);
    });

    And("a new version is added to the entity", (done) => {
      entity.attributes = attributes[1];
      entity.meta = { correlationId: correlationIds[0] };
      crud.upsert(entity, done);
    });

    And("another version is added", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[1] };
      crud.upsert(entity, done);
    });

    And("we note a specific version id", (done) => {
      crud.listVersions(entity.id, (err, dbEntity) => {
        if (err) done(err);
        versionNr = dbEntity[1];
        done();
      });
    });

    When("we remove the entity", (done) => {
      crud.remove(entity.id, done);
    });

    Then("getting all the versions should fail", (done) => {
      crud.listVersions(entity.id, (err, dbEntity) => {
        should.not.equal(err, null);
        should.equal(dbEntity, null);
        done();
      });
    });

    And("getting a specific version should fail", (done) => {
      crud.loadVersion(versionNr, (err, dbEntity) => {
        should.not.equal(err, null);
        should.equal(dbEntity, null);
        done();
      });
    });
  });


  Scenario("Save, remove and forcefully load multiple versions of an entity", () => {
    let entityVersions;
    let versionNrTwoId;
    let versionNrTwo;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      entity.attributes = attributes[0];
      crud.upsert(entity, done);
    });

    And("a new version is added to the entity", (done) => {
      entity.attributes = attributes[1];
      entity.meta = { correlationId: correlationIds[0] };
      crud.upsert(entity, done);
    });

    And("another version is added", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[1] };
      crud.upsert(entity, done);
    });

    When("we remove the entity", (done) => {
      crud.remove(entity.id, done);
    });

    When("we forcefully get all the versions", (done) => {
      crud.listVersions(entity.id, true, (err, dbEntity) => {
        if (err) done(err);
        entityVersions = dbEntity;
        done();
      });
    });

    Then("it should return all added versions", () => {
      entityVersions.should.have.lengthOf(3);
      entityVersions[1].correlationId.should.equal(correlationIds[0]);
    });

    Given("the returned version id of the second version", () => {
      versionNrTwoId = entityVersions[1].versionId;
    });

    When("we forcefully fetch the second version", (done) => {
      crud.loadVersion(versionNrTwoId, true, (err, dbEntity) => {
        if (err) done(err);
        versionNrTwo = dbEntity;
        done();
      });
    });

    Then("it should have the attributes that was saved in that version", () => {
      versionNrTwo.versionId.should.equal(versionNrTwoId);
      versionNrTwo.entity.attributes.should.eql(attributes[1]);
      versionNrTwo.correlationId.should.eql(correlationIds[0]);
    });
  });


});
