module.exports = {
  'Twitter OAuth Token Provider Test': function (browser) {
    browser
      .url("http://localhost:3000/twitter-authentication.html")
      .waitForElementVisible('#output', 5000)
      .waitForElementVisible('#token', 5000)
      .window_handles(function(result) {
          const newWindow = result.value[1];
          this.switchWindow(newWindow);
      })
      .waitForElementVisible('#oauth_form', 5000)
      .setValue('input#username_or_email', process.env.USER)
      .setValue('input#password', process.env.PASSWORD)
      .click('input#allow')
      .window_handles(function(result) {
          const newWindow = result.value[0];
          this.switchWindow(newWindow);
      })
      .waitForElementVisible('#oauthio_result', 5000)
      .waitForElementVisible('#key', 5000)
      .waitForElementVisible('#autentication_result', 5000)
      .waitForElementVisible('#revoke', 5000)
      .waitForElementVisible('#status', 5000)
      .assert.containsText('p#status', 'Status result: {"authenticated":[')
      .end()
  }
}
