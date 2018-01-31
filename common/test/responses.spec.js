/* global describe it */

const nock = require('nock')

const config = require('./layer_config.test.json')

const LayerIDK = require('@layerhq/idk')
const layerIDK = new LayerIDK(config)

const Responses = require('../responses')

const appUUID = config.app_id.replace(/^.*\//, '')

const UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const PART_UUID = Responses.generatePartId(`layer:///messages/${UUID}`, UUID)

const record = {
  conversationId: UUID,
  messageId: UUID,
  senderId: 'user1',
  messageSentAt: new Date(2018, 1, 12).getTime(),
  responsePart: {
    mimeType: 'application/vnd.layer.response+json; role=root; node-id=root',
    body: JSON.stringify({
      'response_to': `layer:///messages/${UUID}`,
      'response_to_node_id': UUID,
      'participant_data': {
        'vote': 'option1'
      }
    })
  }
}

describe('Responses.process', () => {
  it('should update message response part', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts/${PART_UUID}`)
      .reply(200, {})
    nock('https://api.layer.com/')
      .put(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts/${PART_UUID}`)
      .reply(200, {})

    const responses = new Responses(record, layerIDK)

    const parts = { 'user1': record.responsePart }
    return responses.process(parts)
      .then((res) => {
        res.message.should.eql('Message part updated')
      })
  })

  it('should add message response part', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts/${PART_UUID}`)
      .reply(404)
    nock('https://api.layer.com/')
      .filteringRequestBody(() => '*')
      .post(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts`, '*')
      .reply(201)

    const responses = new Responses(record, layerIDK)

    const parts = { 'user1': record.responsePart }
    return responses.process(parts)
      .then((res) => {
        res.message.should.eql('Message part added')
      })
  })

  it('should resolve on client 4xx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts/${PART_UUID}`)
      .reply(400, { error_code: 1 })

    const responses = new Responses(record, layerIDK)

    const parts = { 'user1': record.responsePart }
    return responses.process(parts)
      .then((res) => {
        res.message.should.eql('HTTP client error')
        res.status.should.eql(400)
        res.data.should.eql({ error_code: 1 })
      })
  })

  it('should error on any other 5xxx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts/${PART_UUID}`)
      .reply(500)

    const responses = new Responses(record, layerIDK)

    const parts = { 'user1': record.responsePart }
    return responses.process(parts)
      .catch((err) => {
        err.message.should.eql('Request failed with status code 500')
      })
  })

  it('should resolve on client 4xx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts/${PART_UUID}`)
      .reply(404)
    nock('https://api.layer.com/')
      .filteringRequestBody(() => '*')
      .post(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts`, '*')
      .reply(400, { error_code: 1 })

    const responses = new Responses(record, layerIDK)

    const parts = { 'user1': record.responsePart }
    return responses.process(parts)
      .then((res) => {
        res.message.should.eql('HTTP client error')
        res.status.should.eql(400)
        res.data.should.eql({ error_code: 1 })
      })
  })

  it('should error on any other 5xxx errors', () => {
    nock('https://api.layer.com/')
      .get(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts/${PART_UUID}`)
      .reply(404)
    nock('https://api.layer.com/')
      .filteringRequestBody(() => '*')
      .post(`/apps/${appUUID}/conversations/${UUID}/messages/${UUID}/parts`, '*')
      .reply(500)

    const responses = new Responses(record, layerIDK)

    const parts = { 'user1': record.responsePart }
    return responses.process(parts)
      .catch((err) => {
        err.message.should.eql('Request failed with status code 500')
      })
  })
})
