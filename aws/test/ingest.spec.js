/* global it, describe, before */
const mochaPlugin = require('serverless-mocha-plugin')
const expect = mochaPlugin.chai.expect
const wrapped = mochaPlugin.getWrapper('ingest', '/src/handlers.js', 'ingest')

const helper = require('./helper')

xdescribe('aws:ingest', () => {
  before(helper.tableCleanup)

  it('A valid body should return a 200', () => {
    const event = helper.kinesisEvent({
      responseType: 'response-message',
      conversationId: 'conversation-1',
      senderId: 'sender-1',
      body: JSON.stringify({
        response_to: 'message-1',
        response_to_node_id: 'node-1',
        changes: [
          {
            'operation': 'add',
            'type': 'Set',
            'value': 'red',
            'name': 'selection_1',
            'id': '1'
          }
        ]
      })
    })

    return wrapped.run(event, {})
      .then((response) => {
        expect(response.statusCode).to.be.equal(200)
      })
  })

  it('A valid body should return a 200', () => {
    const event = helper.kinesisEvent({
      responseType: 'response-message',
      conversationId: 'conversation-1',
      senderId: 'sender-1',
      body: JSON.stringify({
        response_to: 'message-1',
        response_to_node_id: 'node-1',
        changes: [
          {
            'operation': 'add',
            'type': 'Set',
            'value': 'black',
            'name': 'selection_1',
            'id': '2'
          }
        ]
      })
    })

    return wrapped.run(event, {})
      .then((response) => {
        expect(response.statusCode).to.be.equal(200)
      })
  })

  it('A valid body should return a 200', () => {
    const event = helper.kinesisEvent({
      responseType: 'response-message',
      conversationId: 'conversation-1',
      senderId: 'sender-2',
      body: JSON.stringify({
        response_to: 'message-1',
        response_to_node_id: 'node-1',
        changes: [
          {
            'operation': 'add',
            'type': 'Set',
            'value': 'green',
            'name': 'selection_2',
            'id': '3'
          }
        ]
      })
    })

    return wrapped.run(event, {})
      .then((response) => {
        expect(response.statusCode).to.be.equal(200)
      })
  })
})
