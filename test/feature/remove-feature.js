"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const uuid = require("uuid");

const crud = require("../../lib/query");
const helper = require("../../lib/testHelper");

Feature("Clean version history for given entity", () => {
  after(helper.tearDown);

  const attributes = [
    { name: "J Doe 1" },
    { name: "J Doe 2" },
    { name: "anonymous" },
    undefined,
  ];

  const entity = {
    id: uuid.v4(),
    type: "person",
  };

  const correlationIds = [ "x", "y", "z" ];
  const expectedEntity = Object.assign({}, entity, {
    attributes: attributes[2],
    meta: { correlationId: correlationIds[2] },
  });

  Scenario("Remove all previous versions of an entity", () => {
    let entityVersions;

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

    When("cleaning the entity history", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[2] };
      crud.cleanEntityHistory(entity, done);
    });

    And("we forcefully get all the versions", (done) => {
      crud.listVersions(entity.id, true, (err, dbEntity) => {
        if (err) return done(err);
        entityVersions = dbEntity;
        return done();
      });
    });

    Then("there should only be one version", () => {
      entityVersions.length.should.eql(1);
    });

    And("the entity should have the latest attributes", (done) => {
      crud.load(entity.id, (err, anonymousEntity) => {
        if (err) return done(err);
        for (const key of Object.keys(expectedEntity)) {
          if (key === "meta") {
            anonymousEntity[key].correlationId.should.eql(entity[key].correlationId);
          } else {
            anonymousEntity[key].should.deep.equal(entity[key]);
          }
        }
        return done();
      });
    });

    And("the version should have the latest attributes", (done) => {
      crud.loadVersion(entityVersions[0].versionId, (err, res) => {
        if (err) return done(err);
        for (const key of Object.keys(expectedEntity)) {
          if (key === "meta") continue;
          res.entity[key].should.deep.equal(entity[key]);
        }
        res.correlationId.should.equal(correlationIds[2]);
        res.entity.meta.correlationId.should.eql(correlationIds[2]);
        return done();
      });
    });
  });

  Scenario("Remove all previous versions of an soft deleted entity", () => {
    let entityVersions;

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
      crud.remove(entity.id, done);
    });

    When("cleaning the entity history", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[2] };
      crud.cleanEntityHistory(entity, done);
    });

    And("we forcefully get all the versions", (done) => {
      crud.listVersions(entity.id, true, (err, dbEntity) => {
        if (err) return done(err);
        entityVersions = dbEntity;
        return done();
      });
    });

    Then("there should only be one version", () => {
      entityVersions.length.should.eql(1);
    });

    And("the entity should have the latest attributes and only possible to fetch forcefully", (done) => {
      crud.load(entity.id, true, (err, anonymousEntity) => {
        if (err) return done(err);
        for (const key of Object.keys(expectedEntity)) {
          if (key === "meta") {
            anonymousEntity[key].correlationId.should.eql(entity[key].correlationId);
          } else {
            anonymousEntity[key].should.deep.equal(entity[key]);
          }
        }
        return done();
      });
    });

    And("the version should have the latest attributes and only possible to fetch forcefully", (done) => {
      crud.loadVersion(entityVersions[0].versionId, true, (err, res) => {
        if (err) return done(err);
        for (const key of Object.keys(expectedEntity)) {
          if (key === "meta") continue;
          res.entity[key].should.deep.equal(entity[key]);
        }
        res.correlationId.should.equal(correlationIds[2]);
        res.entity.meta.correlationId.should.eql(correlationIds[2]);
        return done();
      });
    });
  });

  Scenario("Remove should only be possible for entities that exists", () => {
    before((done) => {
      helper.clearAndInit(done);
    });

    Given("there is no entity is saved", () => {});

    When("cleaning the entity history of an entity that dose not exists", (done) => {
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[2] };
      crud.cleanEntityHistory(entity, (err) => {
        err.message.should.eql("No such entity");
        return done();
      });
    });
  });

  Scenario("Entity needs to have required fields", () => {
    Then("entity needs id", (done) => {
      entity.id = null;
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[2] };
      crud.cleanEntityHistory(entity, (err) => {
        err.message.should.contain("Missing required fields in entity:");
        return done();
      });
    });

    And("entity needs type", (done) => {
      entity.type = null;
      entity.attributes = attributes[2];
      entity.meta = { correlationId: correlationIds[2] };
      crud.cleanEntityHistory(entity, (err) => {
        err.message.should.contain("Missing required fields in entity:");
        return done();
      });
    });
  });
});
