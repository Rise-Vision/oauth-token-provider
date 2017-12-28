const timeout = 5000;
const accessToken = process.env.ACCESS_TOKEN;
const e2eEnv = process.env.E2E_ENV
module.exports = {
  "Twitter OAuth Token Provider Test" (browser) {
    browser
      .url(`http://localhost:3000/twitter-authentication.html?access_token=${accessToken}&env=${e2eEnv}`)
      .waitForElementVisible("#output", timeout)
      .waitForElementVisible("#token", timeout)
      .window_handles(function(result) {
          const newWindow = result.value[1];
          this.switchWindow(newWindow);
      })
      .waitForElementVisible("#oauth_form", timeout)
      .setValue("input#username_or_email", process.env.USER)
      .setValue("input#password", process.env.PASSWORD)
      .click("input#allow")
      .window_handles(function(result) {
          const newWindow = result.value[0];
          this.switchWindow(newWindow);
      })
      .waitForElementVisible("#oauthio_result", timeout)
      .waitForElementVisible("#key", timeout)
      .waitForElementVisible("#autentication_result", timeout)
      .waitForElementVisible("#revoke", timeout)
      .waitForElementVisible("#status", timeout)
      .assert.containsText("p#status", "Status result: {"authenticated":[")
      .end()
  }
}
