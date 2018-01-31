'use strict'

const LayerIDK = require('@layerhq/idk')
const uuid = require('./uuid')

const MIME_TYPES = {
  response: 'application/vnd.layer.response+json',
  responseSummary: 'application/vnd.layer.responsesummary+json',
  responseSummaryFromNode: (nodeId) => `${MIME_TYPES.responseSummary}; role=response_summary; parent-node-id=${nodeId}`
}

module.exports = class Responses {
  /**
   * Responses class constructor
   *
   * @constructor
   * @param  {Object} record   Database record
   * @param  {Object} layerIDK LayerIDK instance
   */
  constructor (record, layerIDK) {
    this.record = record
    this.api = layerIDK.api
  }

  /**
   * Process message response parts
   * Check if message part exists. If it does, update it, if not, add it
   *
   * @param  {Object} parts Message response parts object from db
   */
  process (parts) {
    if (!parts) return Promise.resolve({ message: 'No parts found to process' })
    this.parts = parts

    return this._update()
  }

  _update () {
    return this._getMessagePart()
      .then((res) => this._updateMessagePart())
      .then(() => Promise.resolve({ message: 'Message part updated' }))
      .catch((err) => {
        if (err.response) {
          const { status, data } = err.response
          if (status === 404) return this._add()
          else if (status >= 400 && status < 500) {
            return Promise.resolve({ message: 'HTTP client error', status, data })
          } else return Promise.reject(err)
        } else if (err.request) return Promise.reject(err)
        else return Promise.reject(err)
      })
  }
  _add () {
    return this._addMessagePart()
      .then(() => Promise.resolve({ message: 'Message part added' }))
      .catch((err) => {
        if (err.response) {
          const { status, data } = err.response
          if (status >= 400 && status < 500) {
            return Promise.resolve({ message: 'HTTP client error', status, data })
          } else return Promise.reject(err)
        } else if (err.request) return Promise.reject(err)
        else return Promise.reject(err)
      })
  }

  _getMessagePart () {
    const { conversationId, responsePart } = this.record
    const body = responsePart.body ? JSON.parse(responsePart.body) : null
    if (!body) return Promise.reject(new Error('Missing responsePart.body'))

    const messageId = body.response_to
    const partId = Responses.generatePartId(messageId, body.response_to_node_id)
    return this.api.messages.getPart(conversationId, messageId, partId)
  }

  _addMessagePart () {
    const { conversationId, responsePart } = this.record
    const participantData = {}
    Object.keys(this.parts).map((userId) => {
      const response = this.parts[userId]
      const body = JSON.parse(response.body)
      participantData[userId] = body.participant_data
    })

    const body = responsePart.body ? JSON.parse(responsePart.body) : null
    if (!body) return Promise.reject(new Error('Missing responsePart.body'))

    const messageId = body.response_to
    const nodeId = body.response_to_node_id
    const partId = Responses.generatePartId(messageId, nodeId)
    const part = {
      id: `${messageId}/parts/${partId}`,
      mime_type: MIME_TYPES.responseSummaryFromNode(nodeId),
      body: JSON.stringify({ participant_data: participantData })
    }
    return this.api.messages.addPart(conversationId, messageId, part)
  }

  _updateMessagePart () {
    const { conversationId, responsePart } = this.record
    const participantData = {}
    Object.keys(this.parts).map((userId) => {
      const response = this.parts[userId]
      const body = JSON.parse(response.body)
      participantData[userId] = body.participant_data
    })

    const body = responsePart.body ? JSON.parse(responsePart.body) : null
    if (!body) return Promise.reject(new Error('Missing responsePart.body'))

    const messageId = body.response_to
    const nodeId = body.response_to_node_id
    const partId = Responses.generatePartId(messageId, nodeId)
    const part = {
      mime_type: MIME_TYPES.responseSummaryFromNode(nodeId),
      body: JSON.stringify({ participant_data: participantData })
    }
    return this.api.messages.updatePart(conversationId, messageId, partId, part)
  }

  /**
   * Parse message from webhook
   *
   * @static
   * @param  {Object} message Message object
   */
  static parseMessage (message) {
    let responsePart = null
    message.parts.forEach((part) => {
      if (part.mime_type.indexOf(MIME_TYPES.response) === 0) responsePart = part
    })

    if (!responsePart) return null
    return {
      conversationId: LayerIDK.toUUID(message.conversation.id),
      messageId: LayerIDK.toUUID(message.id),
      senderId: LayerIDK.toUUID(message.sender.user_id),
      messageSentAt: new Date(message.sent_at).getTime(),
      responsePart
    }
  }

  static generatePartId (messageId, nodeId) {
    return uuid.getUUIDByString(messageId + (nodeId || 'root'))
  }
}
