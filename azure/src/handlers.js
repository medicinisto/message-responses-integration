'use strict'

const LayerIDK = require('@layerhq/idk')
const Responses = require('common/responses')

const configJSON = process.env.LAYER_CONFIG ? require(process.env.LAYER_CONFIG) : require('./layer_config.json')
const layerIDK = new LayerIDK(configJSON)

/**
 * Webhook function handler
 */
exports.webhook = (context, req) => {
  const log = layerIDK.logger(context)
  const tabledb = require('./tabledb')

  try {
    const webhook = layerIDK.webhook(req.headers, req.body)

    // Filter non-conversation events
    if (webhook.event.type === 'Message.created') {
      if (!webhook.message.conversation) {
        log.info('Webhook: (not a conversation)')
        context.res = { status: 200 }
        context.done()
        return
      }
    }

    const data = Responses.parseMessage(webhook.message)
    if (!data) {
      context.res = { status: 200 }
      context.done()
      return
    }

    const responses = new Responses(data, layerIDK)
    log.info(`Webhook: ${data.conversationId}:${data.messageId}`)
    tabledb.store(data)
      .then((parts) => responses.process(parts))
      .then((res) => {
        log.info(`Webhook: ${res.message}`)
        if (res.status) {
          log.warn(`HTTP ${res.status}`, {
            code: res.data.code,
            id: res.data.id,
            message: res.data.message
          })
        }
        context.res = { status: 200 }
        context.done()
      })
      .catch((err) => {
        log.error('Webhook:', err)
        context.res = { status: 500 }
        context.done(err)
      })
  } catch (err) {
    log.error('Webhook: ', err)
    context.res = { status: 500 }
    context.done(err)
  }
}

/**
 * Verfy webhook
 * https://docs.layer.com/reference/webhooks/rest.out#verify
 */
exports.verify = (context, req) => {
  const log = layerIDK.logger(context)
  const query = req.query

  log.info('Verify:', query)
  context.res = {
    status: query ? 200 : 400,
    headers: { 'Content-Type': 'text/plain' },
    body: query ? query.verification_challenge : 'Missing `verification_challenge` URL query parameter',
    isRaw: true
  }
  context.done()
}
