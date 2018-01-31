/* global it, describe */
const mochaPlugin = require('serverless-mocha-plugin')
const expect = mochaPlugin.chai.expect
const wrapped = mochaPlugin.getWrapper('verify', '/src/handlers.js', 'verify')

describe('azure:verify', () => {
  it('response.statusCode should be equal to 400 for no eventData', () => {
    const eventData = {}
    const context = {
      res: {},
      done: (err, response) => {
        return { err, response }
      }
    }
    wrapped.run(context, eventData)
    const res = context.res
    expect(res.status).to.be.equal(400)
  })

  it('response.statusCode should be equal to 200', () => {
    const eventData = {
      query: {
        verification_challenge: 'testVerify'
      }
    }
    const context = {
      res: {},
      done: (err, response) => {
        return { err, response }
      }
    }
    wrapped.run(context, eventData)
    const res = context.res
    expect(res.status).to.be.equal(200)
  })

  it('response.body should be equal to queryStringParameters.verification_challenge', () => {
    const eventData = {
      query: {
        verification_challenge: 'testVerify'
      }
    }
    const context = {
      res: {},
      done: (err, response) => {
        return { err, response }
      }
    }
    wrapped.run(context, eventData)
    const res = context.res
    expect(res.body).to.be.equal(eventData.query.verification_challenge)
  })
})
