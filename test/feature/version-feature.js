"use strict";

/* eslint no-undef: 0, new-cap: 0 */

const crud = require("../../lib/crud");
const uuid = require("uuid");
const helper = require("../../lib/testHelper");

Feature("Version", () => {

  const entity = {
    id: uuid.v4(),
    type: "person",
    attributes: {
      name: "J Doe"
    }
  };

  let entityVersions;
  let versionNrTwoId;
  let versionNrTwo;
  const attributesVersion2 = { name: "Version 2" };

  before((done) => {
    helper.clearAndInit(done);
  });

  Scenario("Save and load multiple versions of an entity", () => {

    Given("a new entity is saved", (done) => {
      crud.upsert(entity.id, entity.type, entity.attributes, done);
    });

    And("a new version is added to the entity", (done) => {
      crud.upsert(entity.id, entity.type, attributesVersion2, done);
    });

    And("another version is added", (done) => {
      crud.upsert(entity.id, entity.type, { name: "Version 3" }, done);
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
      versionNrTwo.attributes.should.eql(attributesVersion2);
    });
  });
});
