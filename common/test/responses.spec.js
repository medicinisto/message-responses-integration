/* global describe it */

const nock = require('nock')

const config = require('./layer_config.test.json')
const webhook = require('./mock/webhook.json')

const LayerIDK = require('@layerhq/idk')
const layerIDK = new LayerIDK(config)

const Responses = require('../responses')

const appUUID = config.app_id.replace(/^.*\//, '')

const UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const CONVERSATION_ID = 'ffffffff-cccc-ffff-ffff-ffffffffffff'
const MESSAGE_UUID = 'ffffffff-mmmm-ffff-ffff-ffffffffffff'
const PART_UUID = Responses.generatePartId(MESSAGE_UUID, UUID)

const response = {
  "messageId": MESSAGE_UUID,
  "responses": {
    "sender-1": [
      {
        "name": "selection-1",
        "id": "1",
        "type": "Set",
        "operation": "add",
        "value": "red"
      },
      {
        "name": "selection-1",
        "id": "2",
        "type": "Set",
        "operation": "add",
        "value": "green"
      },
      {
        "name": "selection-1",
        "id": "2",
        "type": "Set",
        "operation": "remove",
        "value": "green"
      }
    ],
    "sender-2": [
      {
        "name": "selection-1",
        "id": "4",
        "type": "Set",
        "operation": "add",
        "value": "black"
      }
    ]
  },
  "responseToNodeId": UUID
}

describe('Responses.parseMessage', () => {
  it('should return parsed message', () => {
    const data = Responses.parseMessage(webhook.message)
    data.should.have.keys('conversationId', 'senderId', 'messagePart')
    data.conversationId.should.be.eql('layer:///conversations/514b6c79-76bc-45a2-a0c4-c4d0f6af5f08')
    data.senderId.should.be.eql('layer:///identities/f9401b9a-aeab-439b-92b1-7832480162cf')
  })
})

describe('Responses.process', () => {
  it('should update message response part', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts/${PART_UUID}`)
      .reply(200, {})
    nock('https://api.layer.com/')
      .put(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts/${PART_UUID}`)
      .reply(200, {})

    const responses = new Responses(CONVERSATION_ID, layerIDK)
    return responses.process(response)
      .then((res) => {
        res.message.should.eql('Message part updated')
      })
  })

  it('should add message response part', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts/${PART_UUID}`)
      .reply(404)
    nock('https://api.layer.com/')
      .filteringRequestBody(() => '*')
      .post(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts`, '*')
      .reply(201)

    const responses = new Responses(CONVERSATION_ID, layerIDK)
    return responses.process(response)
      .then((res) => {
        res.message.should.eql('Message part added')
      })
  })

  it('should resolve on client 4xx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts/${PART_UUID}`)
      .reply(400, { error_code: 1 })

    const responses = new Responses(CONVERSATION_ID, layerIDK)
    return responses.process(response)
      .then((res) => {
        res.message.should.eql('HTTP client error')
        res.status.should.eql(400)
        res.data.should.eql({ error_code: 1 })
      })
  })

  it('should error on any other 5xxx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts/${PART_UUID}`)
      .reply(500)

    const responses = new Responses(CONVERSATION_ID, layerIDK)
    return responses.process(response)
      .catch((err) => {
        err.message.should.eql('Request failed with status code 500')
      })
  })

  it('should resolve on client 4xx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts/${PART_UUID}`)
      .reply(404)
    nock('https://api.layer.com/')
      .filteringRequestBody(() => '*')
      .post(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts`, '*')
      .reply(400, { error_code: 1 })

    const responses = new Responses(CONVERSATION_ID, layerIDK)
    return responses.process(response)
      .then((res) => {
        res.message.should.eql('HTTP client error')
        res.status.should.eql(400)
        res.data.should.eql({ error_code: 1 })
      })
  })

  it('should error on any other 5xxx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts/${PART_UUID}`)
      .reply(404)
    nock('https://api.layer.com/')
      .filteringRequestBody(() => '*')
      .post(`/apps/${appUUID}/conversations/${CONVERSATION_ID}/messages/${MESSAGE_UUID}/parts`, '*')
      .reply(500)

    const responses = new Responses(CONVERSATION_ID, layerIDK)
    return responses.process(response)
      .catch((err) => {
        err.message.should.eql('Request failed with status code 500')
      })
  })
})
