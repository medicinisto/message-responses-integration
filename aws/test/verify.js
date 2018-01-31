/* global it, describe */
const mochaPlugin = require('serverless-mocha-plugin')
const expect = mochaPlugin.chai.expect
const wrapped = mochaPlugin.getWrapper('verify', '/src/handlers.js', 'verify')

describe('aws:verify', () => {
  it('response.statusCode should be equal to 400 for no eventData', () => {
    const eventData = {}
    return wrapped.run(eventData, {}).then((response) => {
      expect(response.statusCode).to.be.equal(400)
    })
  })

  it('response.statusCode should be equal to 200', () => {
    const eventData = {
      queryStringParameters: {
        verification_challenge: 'testVerify'
      }
    }
    return wrapped.run(eventData, {}).then((response) => {
      expect(response.statusCode).to.be.equal(200)
    })
  })

  it('response.body should be equal to queryStringParameters.verification_challenge', () => {
    const eventData = {
      queryStringParameters: {
        verification_challenge: 'testVerify'
      }
    }
    return wrapped.run(eventData, {}).then((response) => {
      expect(response.body).to.be.equal(eventData.queryStringParameters.verification_challenge)
    })
  })
})
