'use strict'

const LayerIDK = require('@layerhq/idk')
const uuid = require('./uuid')
const crdt = require('./crdt')

const MIME_TYPES = {
  response: 'application/vnd.layer.response-v2+json',
  initialState: 'application/vnd.layer.initialresponsestate-v1+json',
  responseSummary: 'application/vnd.layer.responsesummary-v2+json',
  responseSummaryFromNode: (nodeId) => `${MIME_TYPES.responseSummary}; role=response_summary; parent-node-id=${nodeId}`
}

module.exports = class Responses {
  /**
   * Responses class constructor
   *
   * @constructor
   * @param  {Object} conversationId   Layer conversation ID
   * @param  {Object} layerIDK LayerIDK instance
   */
  constructor (conversationId, layerIDK) {
    this.conversationId = conversationId
    this.api = layerIDK.api
  }

  /**
   * Process message response changes
   * Check if message part exists. If it does, update it, if not, add it
   *
   * @param  {Object} changes Message response changes object from db
   */
  process (changes) {
    if (!changes) return Promise.resolve({ message: 'No changes found to process' })

    // If changes is an array that means it's initial state
    if (Array.isArray(changes)) {
      return this.initialState(changes)
    } else {
      return this.responseUpdate(changes)
    }
  }

  initialState (changes) {
    const operations = []
    changes.forEach((state) => {
      operations.push(() => this._replaceMessagePart(state))
    })
    return LayerIDK.promiseSerial(operations)
      .then(() => Promise.resolve({ message: 'Message part replaced' }))
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

  responseUpdate (changes) {
    return this._getMessagePart(changes)
      .then((res) => this._updateMessagePart(changes))
      .then(() => Promise.resolve({ message: 'Message part updated' }))
      .catch((err) => {
        if (err.response) {
          const { status, data } = err.response
          if (status === 404) return this._responseAdd(changes)
          else if (status >= 400 && status < 500) {
            return Promise.resolve({ message: 'HTTP client error', status, data })
          } else return Promise.reject(err)
        } else if (err.request) return Promise.reject(err)
        else return Promise.reject(err)
      })
  }

  _replaceMessagePart ({ initialPartId, messageId, responseToNodeId, responses }) {
    const body = crdt.toResponseSummary(responses)
    const part = {
      mime_type: MIME_TYPES.responseSummaryFromNode(responseToNodeId),
      body: JSON.stringify(body)
    }
    return this.api.messages.updatePart(this.conversationId, messageId, initialPartId, part)
  }
  
  _responseAdd (changes) {
    return this._addMessagePart(changes)
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

  _getMessagePart ({ initialPartId, messageId, responseToNodeId }) {
    const partId = initialPartId || Responses.generatePartId(messageId, responseToNodeId)
    return this.api.messages.getPart(this.conversationId, messageId, partId)
  }

  _addMessagePart ({ messageId, responseToNodeId, responses }) {
    const partId = Responses.generatePartId(messageId, responseToNodeId)
    const body = crdt.toResponseSummary(responses)
    const part = {
      id: `${messageId}/parts/${partId}`,
      mime_type: MIME_TYPES.responseSummaryFromNode(responseToNodeId),
      body: JSON.stringify(body)
    }
    return this.api.messages.addPart(this.conversationId, messageId, part)
  }

  _updateMessagePart ({ initialPartId, messageId, responseToNodeId, responses }) {
    const partId = initialPartId || Responses.generatePartId(messageId, responseToNodeId)
    const body = crdt.toResponseSummary(responses)
    const part = {
      mime_type: MIME_TYPES.responseSummaryFromNode(responseToNodeId),
      body: JSON.stringify(body)
    }
    return this.api.messages.updatePart(this.conversationId, messageId, partId, part)
  }

  /**
   * Parse message from webhook
   *
   * @static
   * @param  {Object} message Message object
   */
  static parseMessage (message) {
    let responseType = null
    let initialState = null
    let messagePart = null

    message.parts.forEach((part) => {
      if (part.mime_type.indexOf(MIME_TYPES.response) === 0) {
        if (!part.body) return null
        responseType = 'response-message'
        messagePart = part
      }
      if (part.mime_type.indexOf(MIME_TYPES.initialState) === 0) {
        responseType = 'initial-state'
        if (!initialState) initialState = []
        initialState.push({
          messageId: message.id,
          responseToNodeId: LayerIDK.parseMimeType(part.mime_type).parameters['parent-node-id'],
          messagePart: part
        })
      }
    })

    if (!responseType) return null
    return {
      responseType,
      conversationId: message.conversation.id,
      senderId: message.sender.id,
      initialState,
      messagePart
    }
  }

  /**
   * Convert initial state data to db format
   *
   * @static
   * @param  {Object} initialState Inital state object
   */
  static initialChanges (initialState) {
    return initialState.map(({ messageId, responseToNodeId, messagePart }) => {
      const body = JSON.parse(messagePart.body)
      const responses = body.reduce((res, { operation, type, value, name, id, identity_id }) => {
        if (res[identity_id]) {
          res[identity_id].push({ operation, type, value, name, id })
        } else {
          res[identity_id] = [{ operation, type, value, name, id }]
        }
        return res
      }, {})
      return {
        initialPartId: messagePart.id,
        messageId,
        responseToNodeId,
        responses
      }
    })
  }

  static generatePartId (messageId, nodeId) {
    return uuid.getUUIDByString(messageId + (nodeId || 'root'))
  }
}
