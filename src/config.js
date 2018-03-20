/* eslint no-magic-numbers: "off"*/

let debugMode = false;

module.exports = {
  defaultPort: 80,
  defaultSessionSecret: "RV OTP",
  projectId: "avid-life-623",
  bucket: "risevision-company-notifications",
  cookieMaxAge: 15 * 24 * 60 * 60 * 1000,
  defaultJWTSecret: "Test token",
  debugToggle() {
    debugMode = !debugMode;
    console.log(`Debug mode is ${debugMode ? "on" : "off"}`);
  },
  debugMode
}
