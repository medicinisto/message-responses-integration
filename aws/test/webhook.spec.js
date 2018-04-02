/* global it, describe */
const mochaPlugin = require('serverless-mocha-plugin')
const expect = mochaPlugin.chai.expect
const wrapped = mochaPlugin.getWrapper('webhook', '/src/handlers.js', 'webhook')

const body = require('./mock/event.json')
const headers = require('./mock/headers.json')
const AWS = require('aws-sdk-mock')

AWS.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
  callback(null, { status: 200 })
})

AWS.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
  callback(null, { status: 200 })
})

AWS.mock('DynamoDB.DocumentClient', 'batchWrite', (params, callback) => {
  callback(null, { status: 200 })
})

AWS.mock('DynamoDB.DocumentClient', 'batchGet', (params, callback) => {
  callback(null, [])
})

describe('aws:webhook', () => {
  it('A valid body should return a 200', () => {
    const eventData = {
      headers,
      body: JSON.stringify(body)
    }
    return wrapped.run(eventData, {})
      .then((response) => {
        expect(response.statusCode).to.be.equal(200)
      })
  })

  it('An invalid body should throw an error', () => {
    const eventData = {
      headers,
      body: ''
    }
    return wrapped.run(eventData, {})
      .catch(err => {
        const isError = err instanceof Error
        expect(isError).to.be.equal(true)
      })
  })

  it('Invalid user-agent must fail', () => {
    const eventData = {
      headers: Object.assign({}, headers, { 'User-Agent': null }),
      body: JSON.stringify(body)
    }
    return wrapped.run(eventData, {})
      .catch(err => {
        const isError = err instanceof Error
        expect(isError).to.be.equal(true)
      })
  })

  it('Invalid event type should fail', () => {
    const INVALID_EVENT_TYPES = [
      'Message.updated',
      'Conversation.created',
      'Conversation.updated',
      'Participation.created',
      'Channel.created',
      'Channel.updated',
      'Channel.deleted',
      'Membership.created',
      'Membership.deleted'
    ]
    const promises = []
    INVALID_EVENT_TYPES.forEach(eventType => {
      const eventData = {
        headers: Object.assign({}, headers, { 'layer-webhook-event-type': eventType }),
        body: JSON.stringify(body)
      }
      promises.push(wrapped.run(eventData, {}))
    })

    return Promise.all(promises)
      .catch(err => {
        const isError = err instanceof Error
        expect(isError).to.be.equal(true)
      })
  })
})
