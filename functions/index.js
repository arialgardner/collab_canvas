/**
 * Firebase Cloud Functions
 *
 * Main entry point for all Cloud Functions
 */

const {setGlobalOptions} = require("firebase-functions/v2");

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// V6: AI Command System
const {parseAICommand} = require("./ai/parseCommand");

// Export functions
exports.parseAICommand = parseAICommand;
