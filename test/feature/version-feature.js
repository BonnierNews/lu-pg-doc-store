"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const crud = require("../../lib/query");
const uuid = require("uuid");
const helper = require("../../lib/testHelper");

Feature("Version", () => {

  const attributes = [
    { name: "J Doe 1" },
    { name: "J Doe 2" },
    { name: "J Doe 3" },
    undefined
  ];

  const entity = {
    id: uuid.v4(),
    type: "person"
  };

  const correlationIds = ["x", "y", "z", "ao"];

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
        if (err) return done(err);
        entityVersions = dbEntity;
        return done();
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
        if (err) return done(err);
        versionNrTwo = dbEntity;
        return done();
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
        if (err) return done(err);
        versionNr = dbEntity[1];
        return done();
      });
    });

    When("we remove the entity", (done) => {
      crud.remove(entity.id, done);
    });

    Then("getting all the versions should fail", (done) => {
      crud.listVersions(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        dbEntity.should.eql([]);
        return done();
      });
    });

    And("getting a specific version should fail", (done) => {
      crud.loadVersion(versionNr, (err, dbEntity) => {
        if (err) return done(err);
        should.equal(dbEntity, null);
        return done();
      });
    });
  });


  Scenario("Save, remove and forcefully load multiple versions of an entity", () => {
    let entityVersions;
    let versionNrTwoId;
    let versionNrFourId;
    let versionNrTwo;
    let versionNrFour;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      entity.attributes = attributes[0];
      entity.meta = { correlationId: correlationIds[0] };
      crud.upsert(entity, done);
    });

    And("a second version is added to the entity", (done) => {
      entity.attributes = attributes[1];
      entity.meta = { correlationId: correlationIds[1] };
      crud.upsert(entity, done);
    });

    And("a third version is added", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[2] };
      crud.upsert(entity, done);
    });

    And("we remove the entity", (done) => {
      crud.remove(entity.id, correlationIds[3], done);
    });

    When("we forcefully get all the versions", (done) => {
      crud.listVersions(entity.id, true, (err, dbEntity) => {
        if (err) return done(err);
        entityVersions = dbEntity;
        return done();
      });
    });

    Then("it should have return all added versions", () => {
      entityVersions.should.have.lengthOf(4);
      entityVersions[0].correlationId.should.equal(correlationIds[0]);
      entityVersions[1].correlationId.should.equal(correlationIds[1]);
      entityVersions[2].correlationId.should.equal(correlationIds[2]);
      entityVersions[3].correlationId.should.equal(correlationIds[3]);
    });

    And("forcefully fetching the second version, it should have all attributes saved in that version", (done) => {
      versionNrTwoId = entityVersions[1].versionId;
      crud.loadVersion(versionNrTwoId, true, (err, dbEntity) => {
        if (err) return done(err);
        versionNrTwo = dbEntity;
        versionNrTwo.versionId.should.equal(versionNrTwoId);
        versionNrTwo.entity.attributes.should.eql(attributes[1]);
        versionNrTwo.correlationId.should.eql(correlationIds[1]);
        return done();
      });
    });

    And("forcefully fetching the fourth (last) version, it should have no attributes as it is the empty (removed) version", (done) => {
      versionNrFourId = entityVersions[3].versionId;
      crud.loadVersion(versionNrFourId, true, (err, dbEntity) => {
        if (err) return done(err);
        versionNrFour = dbEntity;
        should.equal(versionNrFour.entity.attributes, attributes[3]);
        versionNrFour.correlationId.should.equal(correlationIds[3]);
        return done();
      });
    });
  });

  Scenario("Save, remove and restore a version of an entity", () => {
    let entityVersions;
    let restoredVersion;
    let restoredEntity;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      entity.attributes = attributes[0];
      entity.meta = { correlationId: correlationIds[0] };
      crud.upsert(entity, done);
    });

    And("a second version is added to the entity", (done) => {
      entity.attributes = attributes[1];
      entity.meta = { correlationId: correlationIds[1] };
      crud.upsert(entity, done);
    });

    And("we remove the entity", (done) => {
      crud.remove(entity.id, correlationIds[2], done);
    });

    And("we forcefully get all the versions", (done) => {
      crud.listVersions(entity.id, true, (err, dbEntity) => {
        if (err) return done(err);
        entityVersions = dbEntity;
        return done();
      });
    });

    When("we restore the second version", (done) => {
      crud.restoreVersion(entityVersions[1].versionId, correlationIds[3], (err, res) => {
        if (err) return done(err);
        restoredVersion = res.versionId;
        return done();
      });
    });

    Then("the restored vesion should equal the second version, except correlationId and versionId", (done) => {
      crud.loadVersion(restoredVersion, (err, res) => {
        if (err) return done(err);
        restoredEntity = res.entity;
        res.correlationId.should.equal(correlationIds[3]);
        res.versionId.should.equal(restoredVersion);
        restoredVersion.should.not.equal(entityVersions[1].versionId);
        restoredEntity.id.should.equal(entity.id);
        restoredEntity.type.should.equal(entity.type);
        restoredEntity.attributes.should.eql(entity.attributes);
        return done();
      });
    });

    And("there should be a total of four versions", (done) => {
      crud.listVersions(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        dbEntity.length.should.equal(4);
        return done();
      });
    });

    And("the last version should be the restored version", (done) => {
      crud.load(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        dbEntity.should.eql(restoredEntity);
        return done();
      });
    });
  });

  Scenario("Save some versions and restore a previous version of an entity", () => {
    let entityVersions;
    let restoredVersion;
    let restoredEntity;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("a new entity is saved", (done) => {
      entity.attributes = attributes[0];
      entity.meta = { correlationId: correlationIds[0] };
      crud.upsert(entity, done);
    });

    And("a second version is added to the entity", (done) => {
      entity.attributes = attributes[1];
      entity.meta = { correlationId: correlationIds[1] };
      crud.upsert(entity, done);
    });

    And("a third version is added to the entity", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[2] };
      crud.upsert(entity, done);
    });

    And("we get all the versions", (done) => {
      crud.listVersions(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        entityVersions = dbEntity;
        return done();
      });
    });

    When("we restore the second version", (done) => {
      crud.restoreVersion(entityVersions[1].versionId, correlationIds[3], (err, res) => {
        if (err) return done(err);
        restoredVersion = res.versionId;
        return done();
      });
    });

    Then("the restored vesion should equal the second version, except correlationId and versionId", (done) => {
      crud.loadVersion(restoredVersion, (err, res) => {
        if (err) return done(err);
        restoredEntity = res.entity;
        res.correlationId.should.equal(correlationIds[3]);
        res.versionId.should.equal(restoredVersion);
        restoredVersion.should.not.equal(entityVersions[1].versionId);
        restoredEntity.id.should.equal(entity.id);
        restoredEntity.type.should.equal(entity.type);
        restoredEntity.attributes.should.eql(attributes[1]);
        return done();
      });
    });

    And("there should be a total of four versions", (done) => {
      crud.listVersions(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        dbEntity.length.should.equal(4);
        return done();
      });
    });

    And("the last version should be the restored version", (done) => {
      crud.load(entity.id, (err, dbEntity) => {
        if (err) return done(err);
        dbEntity.should.eql(restoredEntity);
        return done();
      });
    });
  });

});
