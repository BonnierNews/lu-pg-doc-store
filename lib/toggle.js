"use strict";

const config = require("exp-config");

const knownToggles = [];

knownToggles.sort();

config.toggle = config.toggle || {};

function toggle(name) {
  if (knownToggles.indexOf(name) === -1) {
    throw new Error(`Unknown toggle '${name}'`);
  }
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  const value = config.toggle[name];
  return value === true || value === "true";
}

toggle.knownToggles = knownToggles;

module.exports = toggle;
