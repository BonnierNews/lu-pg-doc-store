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

  let entityVersions;
  let versionNrTwoId;
  let versionNrTwo;
  const correlationIds = ["x", "y", "z"];

  before((done) => {
    helper.clearAndInit(done);
  });

  Scenario("Save and load multiple versions of an entity", () => {

    Given("a new entity is saved", (done) => {
      const entity1 = {
        id: entity.id,
        type: entity.type,
        attributes: attributes[0],
        meta: {
          correlationId: correlationIds[0]
        }
      };
      crud.upsert(entity1, done);
    });

    And("a new version is added to the entity", (done) => {
      const entity2 = {
        id: entity.id,
        type: entity.type,
        attributes: attributes[1],
        meta: {
          correlationId: correlationIds[1]
        }
      };
      crud.upsert(entity2, done);
    });

    And("another version is added", (done) => {
      const entity3 = {
        id: entity.id,
        type: entity.type,
        attributes: attributes[2],
        meta: {
          correlationId: correlationIds[2]
        }
      };
      crud.upsert(entity3, done);
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
      entityVersions[1].correlationId.should.equal(correlationIds[1]);
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
      versionNrTwo.attributes.should.eql(attributes[1]);
      versionNrTwo.correlationId.should.eql(correlationIds[1]);
    });
  });
});
