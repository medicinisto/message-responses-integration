/* global it, describe */
const mochaPlugin = require('serverless-mocha-plugin')
const expect = mochaPlugin.chai.expect
const wrapped = mochaPlugin.getWrapper('webhook', '/src/handlers.js', 'webhook')
const proxyquire = require('proxyquire')

const body = require('./mock/event.json')
const headers = require('./mock/headers.json')

describe('azure:webhook', () => {
  it('A valid body should filter content', () => {
    const context = {
      res: {},
      done: (err, response) => {
        expect(err).to.be.undefined
        const res = context.res
        expect(res.status).to.be.equal(200)
      }
    }

    const eventData = {
      headers,
      body: JSON.stringify(body)
    }

    const fakeResponse = {
      'repsonses': {
        '_': {
        }
      }
    }

    const MockTableDB = {
      store: (data) => {
        return Promise.resolve(fakeResponse)
      }
    }

    const filterProxy = proxyquire('../src/handlers', {
      './tabledb': MockTableDB
    })

    filterProxy.webhook(context, eventData)
  })

  it('An invalid body should fail or return error', (done) => {
    const context = {
      res: {},
      done: (err, response) => {
        const isError = err instanceof Error
        expect(isError).to.be.equal(true)
        done()
      }
    }
    const eventData = {
      headers: null,
      body: null
    }

    const fakeResponse = {
      'repsonses': {
        '_': {
        }
      }
    }

    const MockTableDB = {
      store: (data) => {
        return Promise.resolve(fakeResponse)
      }
    }

    const filterProxy = proxyquire('../src/handlers', {
      './tabledb': MockTableDB
    })

    filterProxy.webhook(context, eventData)
  })

  it('Should not include headers and body if filter returns null', () => {
    const context = {
      res: {},
      done: (err, response) => {
        const res = context.res
        expect(res.headers).to.be.undefined
        expect(res.body).to.be.undefined
      }
    }

    const eventData = {
      headers,
      body: JSON.stringify(body)
    }
    const fakeResponse = null

    // create a simple mockFilter class
    const MockTableDB = {
      store: (data) => {
        return Promise.resolve(fakeResponse)
      }
    }

    const filterProxy = proxyquire('../src/handlers', {
      './tabledb': MockTableDB
    })

    filterProxy.webhook(context, eventData)
  })

  it('An invalid body should return error', () => {
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
