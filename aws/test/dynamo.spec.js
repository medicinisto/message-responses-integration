/* global it, describe */
const mochaPlugin = require('serverless-mocha-plugin')
const expect = mochaPlugin.chai.expect
const wrapped = mochaPlugin.getWrapper('ingest', '/src/handlers.js', 'ingest')

const helper = require('./helper')
const dynamo = require('../src/dynamo')

xdescribe('dynamo.store', () => {
  before(helper.tableCleanup)

  it('[response-message] should return stored data', () => {
    const changes = [
      {
        "operation": "add",
        "type": "Set",
        "value": "red",
        "name": "selection-1",
        "id": "1"
      },
      {
        "operation": "add",
        "type": "Set",
        "value": "green",
        "name": "selection-1",
        "id": "2"
      },
      {
        "operation": "remove",
        "type": "Set",
        "value": "green",
        "name": "selection-1",
        "id": "3"
      }
    ]
    const data = {
      responseType: 'response-message',
      conversationId: 'conversation-1',
      senderId: 'sender-1',
      messagePart: {
        body: JSON.stringify({
          response_to: 'message-1',
          response_to_node_id: 'node-1',
          changes
        })
      }
    }

    return dynamo.store(data)
      .then((res) => {
        expect(res.messageId).to.be.equal('message-1')
        expect(res.responseToNodeId).to.be.equal('node-1')
        expect(res.responses['sender-1']).to.deep.equal(changes)
      })
  })

  it('[initial-state] should return stored data', () => {
    const changes = [
      {
        "operation": "add",
        "type": "Set",
        "value": "red",
        "name": "selection-1",
        "id": "1",
        "identity_id": "sender-1"
      },
      {
        "operation": "add",
        "type": "Set",
        "value": "green",
        "name": "selection-1",
        "id": "2",
        "identity_id": "sender-1"
      }
    ]
    const data = {
      responseType: 'initial-state',
      conversationId: 'conversation-1',
      senderId: 'sender-1',
      initialState: [{
        messageId: 'message-1',
        responseToNodeId: 'node-1',
        messagePart: {
          id: 'part-1',
          body: [JSON.stringify(changes)]
        }
      }]
    }

    return dynamo.store(data)
      .then((res) => {
        res.forEach((item) => {
          expect(item.initialPartId).to.be.equal('part-1')
          expect(item.messageId).to.be.equal('message-1')
          expect(item.responseToNodeId).to.be.equal('node-1')
          expect(item.responses['sender-1']).to.deep.equal(changes.map((c) => {
            delete c.identity_id
            return c
          }))
        })
      })
  })
})

