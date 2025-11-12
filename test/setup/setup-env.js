// This file is required with .mocharc.json before setup.js
// set process.env variables in a separate file so they are resolved before config is imported in setup.js

// Make sure dates are displayed in the correct timezone
process.env.TZ = "Europe/Stockholm";

// Tests should always run in test environment
export default process.env.NODE_ENV = "test";
