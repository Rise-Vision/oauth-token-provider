# Rise OAuth Token Provider Service [![CircleCI](https://circleci.com/gh/Rise-Vision/oauth-token-provider/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/oauth-token-provider/tree/master)

## Introduction

The OAuth Token Provider Service is responsible to allow users to integrate their digital signage with 3rd party services like Twitter, Facebook and so on.

Project Name works in conjunction with [Rise Vision](http://www.risevision.com), the [digital signage management application](http://apps.risevision.com/) that runs on [Google Cloud](https://cloud.google.com).

At this time Chrome is the only browser that this project and Rise Vision supports.

## Built With
- NPM (node package manager)
- NodeJs
- Mocha
- Nightwatch
- Oauth.io
- Express
- Redis

## Development

### Local Development Environment Setup and Installation

First you need to have NPM and NodeJS installed.

You will also need to have Redis server installed and running before running the OAuth Token Provider.

Then you can clone the project with the following command
```
git clone https://github.com/Rise-Vision/oauth-token-provider.git
```

### Run Local
First you need to install the dependencies with:
```
npm install
```

Then you can start the server with:
```
npm run dev
```

After that you can see it running under http://localhost:8080/oauthtokenprovider/

### Dependencies
- Redis server

### Testing
Unit tests can be run with:
```
npm run test-unit
```

Integration tests can be run with:
```
npm run test-integration
```

E2E tests will require keys and passwords that are private
```
OTP_OAUTHIO_APP_KEY= OTP_OAUTHIO_APP_SECRET= USER= PASSWORD= ACCESS_TOKEN= npm run test-e2e
```

## Submitting Issues
If you encounter problems or find defects we really want to hear about them. If you could take the time to add them as issues to this Repository it would be most appreciated. When reporting issues please use the following format where applicable:

**Reproduction Steps**

1. did this
2. then that
3. followed by this (screenshots / video captures always help)

**Expected Results**

What you expected to happen.

**Actual Results**

What actually happened. (screenshots / video captures always help)

## Contributing
All contributions are greatly appreciated and welcome! If you would first like to sound out your contribution ideas please post your thoughts to our [community](http://community.risevision.com), otherwise submit a pull request and we will do our best to incorporate it

### Suggested Contributions
- *we need this*
- *and we need that*
- *we could really use this*
- *and if we don't already have it (see above), we could use i18n Language Support*

## Resources
If you have any questions or problems please don't hesitate to join our lively and responsive community at http://community.risevision.com.

If you are looking for user documentation on Rise Vision please see http://www.risevision.com/help/users/

If you would like more information on developing applications for Rise Vision please visit http://www.risevision.com/help/developers/.

**Facilitator**

[Rodrigo Serviuc Pavezi](https://github.com/rodrigopavezi "Rodrigo Pavezi")
