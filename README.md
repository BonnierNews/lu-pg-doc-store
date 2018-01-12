# pg-doc-store

## Purpose and features
Opionated solution for storing documents as entities in postgres
without an ORM-solution. This package aims to use postgres as a
document store (storing json data as documents) but with the benefits
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
db.remove(id, (dbErr, res) => {
  if (dbErr) return dbErr;
  // res.removed will contain the id if there was an entity to remove
});

```

## Versions
All updates uses upsert and stores updates to an existing entity as a
new version in the entity\_version table. The entity table contains a
reference to the latest version. Attributes are stored in the
entity\_version table, i.e. the attributes column contains a specific
version of the JSON document.

## (Soft) removal
A document can be marked as removed. A document and its' versions will
no longer be listed of read using the load and list functions, unless
the second argument is set to true (force). It is not possible to
upsert a removed document (it will be considered a conflict).
