"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const query = require("../../lib/query");
const uuid = require("uuid");
const helper = require("../../lib/testHelper");

Feature("Entity", () => {

  const entity = {
    id: uuid.v4(),
    type: "person",
    attributes: {
      name: "J Doe"
    },
    relationships: [
      {
        "system": "system.name",
        "type": "foreign.type",
        "id": "type.guid"
      },
      {
        "system": "other.system.name",
        "type": "other.foreign.type",
        "id": "other.type.guid"
      }
    ],
    externalIds: {
      "system": {
        "type": "externalId"
      },
      "other.system": {
        "other.type": "otherExternalId"
      }
    }
  };

  Scenario("Save and load an entity", () => {

    before((done) => {
      helper.clearAndInit(done);
    });

    let savedEntity;

    Given("a new entity is saved", (done) => {
      query.upsert(entity, done);
    });

    When("we load it", (done) => {
      query.load(entity.id, (err, dbEntity) => {
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
      query.upsert(entity, done);
    });

    When("we delete it", (done) => {
      query.remove(entity.id, done);
    });

    Then("it should not be possible to load without force", (done) => {
      query.load(entity.id, (err, dbEntity) => {
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
      query.upsert(entity, done);
    });

    When("we delete it", (done) => {
      query.remove(entity.id, (err) => {
        if (err) return done(err);
        return done();
      });
    });

    Then("we load it with force", (done) => {
      query.load(entity.id, true, (err, dbEntity) => {
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
      query.upsert(entity, done);
    });

    And("we delete it", (done) => {
      query.remove(entity.id, (err) => {
        if (err) return done(err);
        return done();
      });
    });

    Then("it should not be possible to update the entity", (done) => {
      query.upsert(entity, (err, res) => {
        if (err) return done(err);
        res.wasConflict.should.eql(true);
        return done();
      });
    });
  });

  Scenario("Removing an entity that has been soft removed", () => {
    before((done) => {
      helper.clearAndInit(done);
    });

    Given("that there is an entity in the db", (done) => {
      query.upsert(entity, done);
    });

    And("we remove the entity", (done) => {
      query.remove(entity.id, (err, res) => {
        if (err) return done(err);
        should.equal(res.removed, entity.id);
        return done();
      });
    });

    When("we try to remove it again nothing is removed", (done) => {
      query.remove(entity.id, (err, res) => {
        if (err) return done(err);
        should.equal(res.removed, null);
        return done();
      });
    });

  });

  Scenario("Removing an entity that does not exist.", () => {
    before((done) => {
      helper.clearAndInit(done);
    });

    When("We remove an entity that never existed we should have removed nothing.", (done) => {
      query.remove(entity.id, (err, res) => {
        if (err) return done(err);
        should.equal(res.removed, null);
        return done();
      });
    });
  });

  Scenario("Saving an entity without a type should yield error", () => {
    let upsertErr = null;

    before((done) => {
      helper.clearAndInit(done);
    });

    When("We add an entity without a type", (done) => {
      query.upsert({id: "foo", attributes: {}}, (err) => {
        upsertErr = err;
        done();
      });
    });

    Then("We should get an error", () => {
      should.not.equal(upsertErr, null);
    });
  });

  Scenario("Get entity by relationship", () => {
    let savedEntity;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("that there is an entity in the db", (done) => {
      query.upsert(entity, done);
    });

    When("we try to load it by relationship", (done) => {
      const rel = entity.relationships[0];
      query.queryBySingleRelationship({
        entityType: entity.type,
        relationType: rel.type,
        id: rel.id
      }, (err, dbEntities) => {
        if (err) return done(err);
        savedEntity = dbEntities;
        return done();
      });
    });

    Then("it should be found and match the one upserted", () => {
      savedEntity.should.deep.equal(entity);
    });
  });

  Scenario("Get multiple entities by relationship", () => {
    const otherEntity = Object.assign({}, entity, {id: uuid.v4()});
    let savedEntities;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("that there TWO entities in the db", (done) => {
      query.upsert(entity, (err) => {
        if (err) return done(err);
        query.upsert(otherEntity, done);
      });
    });

    When("we try to load them by relationship", (done) => {
      const rel = entity.relationships[0];
      query.queryByRelationship({
        entityType: entity.type,
        relationType: rel.type,
        id: rel.id
      }, (err, dbEntities) => {
        if (err) return done(err);
        savedEntities = dbEntities;
        return done();
      });
    });

    Then("it should be found and match the one upserted", () => {
      savedEntities.length.should.equal(2);
      savedEntities.should.have.deep.members([entity, otherEntity]);
    });
  });

  Scenario("Get entity by externalId", () => {
    let savedEntity;

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("that there is an entity in the db", (done) => {
      query.upsert(entity, done);
    });

    When("we try to load it by externalId", (done) => {
      query.loadByExternalId({
        entityType: entity.type,
        systemName: "system",
        externalIdType: "type",
        id: "externalId"
      }, (err, dbEntity) => {
        if (err) return done(err);
        savedEntity = dbEntity;
        return done();
      });
    });

    Then("it should be found and match the one upserted", () => {
      savedEntity.should.deep.eql(entity);
    });
  });

  Scenario("Loading docs with ambiguous externalId", () => {
    const otherEntity = Object.assign({}, entity, {id: uuid.v4()});

    before((done) => {
      helper.clearAndInit(done);
    });

    Given("that there are two entities in the db with the same externalId", (done) => {
      query.upsert(entity, (err) => {
        if (err) return done(err);
        query.upsert(otherEntity, done);
      });
    });

    let error, savedEntity;
    When("we try to load ONE of them by externalId", (done) => {
      query.loadByExternalId({
        entityType: entity.type,
        systemName: "system",
        externalIdType: "type",
        id: "externalId"
      }, (err, dbEntity) => {
        error = err;
        savedEntity = dbEntity;
        return done();
      });
    });

    Then("an error should be thrown", () => {
      error.should.be.an("error");
      should.equal(savedEntity, undefined);
    });
  });

  Scenario("DOC_NOT_FOUND errors when errors enabled", () => {
    before((done) => {
      helper.clearAndInit(done);
    });

    let error1, savedEntity1;
    When("when trying to load non-existent entity by relationship", (done) => {
      const rel = entity.relationships[0];
      query.queryByRelationship({
        entityType: entity.type,
        relationType: rel.type,
        id: rel.id,
        errorOnNotFound: true
      }, (err, dbEntity) => {
        error1 = err;
        savedEntity1 = dbEntity;
        return done();
      });
    });

    let error2, savedEntity2;
    And("when trying to load non-existent entity by externalId", (done) => {
      query.loadByExternalId({
        entityType: entity.type,
        systemName: "system",
        externalIdType: "type",
        id: "externalId",
        errorOnNotFound: true
      }, (err, dbEntity) => {
        error2 = err;
        savedEntity2 = dbEntity;
        return done();
      });
    });

    Then("an error should be thrown from ", () => {
      error1.should.be.an("error");
      should.equal(savedEntity1, undefined);
    });

    Then("an error should be thrown", () => {
      error2.should.be.an("error");
      should.equal(savedEntity2, undefined);
    });
  });
});
