# pg-doc-store

## Purpose and features
Opionated solution for storing documents as entities in postgres
without an ORM-solution. This package aims to use postgres as a
document store (storing JSON data as documents) but with the benefits
of Postgres as a platform and with the occasional use of SQL features
such as referential integrity between identifiers.

## Examples
### Store a document
```js
const db = require("pg-doc-store").crud;

const entity = {
  id: "12903821",
  type: "person", // type is required
  attributes: {
    name: "J Doe"
  },
  meta: {
    correlationId: 123
  }
}

db.upsert(entity, (dbErr, entity) => {
  if (dbErr) return dbErr;
  // entity.id will contain id, will be created with uuid.v4() if not set
});
```
### Load a document
```js
const db = require("pg-doc-store").crud;
const id = "12903821";

db.load(id, (dbErr, entity) => {
  if (dbErr) return dbErr;
  // entity will contain everything that was in the saved entity
});
```

### (Soft) remove a document
```js
db.remove(id, (dbErr) => {
  if (dbErr) return dbErr;
  // this will mark the entity as removed and add an empty version as
  // the last version
});

```

### Restore a version of a document
```js
db.restore(versionId, (dbErr, entity) => {
  if (dbErr) return dbErr;
  // this will make versionId the last version of the entity to which
  // it belongs and unmark the entity as removed (as there is an
  // explicit call to restore the version)
});

```

### Get documents by relationships and externalIds
#### Query by relationship
```js
db.queryByRelationship({
  entityType: "entity.type",
  relationType: "relation.type",
  system: "relation.system",
  id: "relation.id",
  errorOnNotFound: true
}, (dbErr, docs) => {
  if (dbErr) return dbErr;
  // docs will contain a list of docs matching the relation query
});
```
- Setting _errorOnNotFound_ to true will make _dbErr_ contain an error
if a document was not found. This is useful to reduce the amount of
boilerplate error handling code in applications using pg-doc-store.
- Option _system_ is optional but if defined it includes the relation attribute _system_ in the document search.

```js
db.queryBySingleRelationship({
  entityType: "entity.type",
  relationType: "relation.type",
  id: "relation.id",
  errorOnNotFound: true
}, (dbErr, doc) => {
  if (dbErr) return dbErr;
  // doc will contain everything that was in the saved doc
});
```

```js
db.loadByExternalId({
  entityType: "entity.type"
  systemName: "system.name",
  externalIdType: "external.id.type",
  id: "external.id"
}, (dbErr, doc) => {
  if (dbErr) return done(dbErr);
  // doc will contain everything that was in the saved doc
});
```

## Versions
All updates uses upsert and stores updates to an existing entity as a
new version in the entity\_version table. The entity table contains a
reference to the latest version. The document is stored in the
entity\_version table, i.e. the doc column contains a specific
version of the JSON document.

## (Soft) removal
A document can be marked as removed. A document and its' versions will
no longer be listed of read using the load and list functions, unless
the second argument is set to true (force). It is not possible to
upsert a removed document (it will be considered a conflict). Removing
a document adds an empty document as the latest version of the entity
(for traceability).

It is possible to un-remove a document by restoring it to a specific
version, this will create a new (latest) version of the document using
the data from the specified version. This also marks the document as
not removed.

## Adding extra tables

Sometimes whats provided is not sufficient, to address this you could add your own tables to the db:

```js
const migrations = path.join(__dirname, "./extra-migrations");
initDb.init(testMigrations, () => {});
```

The files in the directory should be `.sql`-files and their name should start with a number, which indicates in what order they should be run;

```bash
> ls migrations/

001-entity-and-version.sql
002-add-removed-date.sql
003-type-not-null.sql
004-key-value.sql
```
