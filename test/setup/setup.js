// This file is required with .mocharc.json
import { config as chaiConfig, expect, should } from "chai";
import config from "exp-config";
import fs from "fs";
// mocha-cakes-2 is used as UI in .mocharc.json
import "mocha-cakes-2";

const logLocation = "./logs/test.log";
/* c8 ignore next */
if (fs.existsSync(logLocation)) fs.writeFileSync(logLocation, "", { flag: "w" });

// Setup common test libraries
chaiConfig.truncateThreshold = 0;
chaiConfig.includeStack = true;
Object.assign(global, {
  should: should(),
  expect,
});

/* c8 ignore start This will only fire if we broke some test */
process.on("unhandledRejection", (err) => {
  if (!config.boolean("silenceTestErrors")) {
    // eslint-disable-next-line no-console
    console.log("Caught rejection:");
    // eslint-disable-next-line no-console
    console.error(err);
  }
  throw err;
});
/* c8 ignore stop */
