'use strict'

const LayerIDK = require('@layerhq/idk')
const Responses = require('common/responses')

const configJSON = require(process.env.LAYER_CONFIG || './layer_config.json')
const layerIDK = new LayerIDK(configJSON)

/**
 * Webhook function handler
 */
exports.webhook = (event, context, callback) => {
  const log = layerIDK.logger(context)
  const kinesis = require('./kinesis')

  try {
    const webhook = layerIDK.webhook(event.headers, event.body)

    // Filter non-conversation events
    if (webhook.event.type === 'Message.created') {
      if (!webhook.message.conversation) {
        log.info('Webhook: (not a conversation)')
        callback(null, { statusCode: 200 })
        return
      }
    }

    const data = Responses.parseMessage(webhook.message)
    if (!data) {
      log.info('Webhook: (no response parts)')
      callback(null, { statusCode: 200 })
      return
    }

    log.info(`Webhook: ${data.conversationId}:${data.messageId}`)
    kinesis.insert(data)
      .then(() => {
        log.info('Webhook: OK')
        callback(null, { statusCode: 200 })
      })
      .catch((err) => {
        log.error('Webhook: kinesis.insert', err)
        callback(null, { statusCode: 200 })
      })
  } catch (err) {
    log.error('Webhook: catch', err)
    callback(null, { statusCode: 200 })
  }
}

/**
 * Kinesis ingest function handler
 */
exports.ingest = (event, context, callback) => {
  const dynamodb = require('./dynamo')
  const log = layerIDK.logger(context)

  let record = null
  try {
    const item = event.Records[0]
    record = JSON.parse(Buffer.from(item.kinesis.data, 'base64').toString())
  } catch (err) {
    log.warn('Ingest: parse record', err)
    callback(null, { statusCode: 200 })
    return
  }

  const responses = new Responses(record, layerIDK)
  log.info(`Ingest: ${record.conversationId}:${record.messageId}`)
  dynamodb.store(record)
    .then((parts) => responses.process(parts))
    .then((res) => {
      log.info(`Ingest: ${res.message}`)
      if (res.status) {
        log.warn(`HTTP ${res.status}`, {
          code: res.data.code,
          id: res.data.id,
          message: res.data.message
        })
      }
      callback(null, { statusCode: 200 })
    })
    .catch((err) => {
      log.error('Ingest:', err)
      callback(err)
    })
}

/**
 * Verfy webhook
 * https://docs.layer.com/reference/webhooks/rest.out#verify
 */
exports.verify = (event, context, callback) => {
  const log = layerIDK.logger(context)
  const query = event.queryStringParameters

  log.info('Verify', query)
  callback(null, {
    statusCode: query ? 200 : 400,
    body: query ? query.verification_challenge : 'Missing `verification_challenge` URL query parameter'
  })
}
