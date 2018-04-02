'use strict'

const azure = require('azure-storage')
const LayerIDK = require('@layerhq/idk')
const Responses = require('common/responses')

const config = require('./config')

const client = azure.createTableService(config.tableDBAccountName(), config.tableDBAccessKey())
const generator = azure.TableUtilities.entityGenerator

const TableQuery = azure.TableQuery
const TableName = config.tableName()

exports.store = ({ responseType, senderId, initialState, messagePart }) => {
  switch (responseType) {
    case 'initial-state':
      const changes = Responses.initialChanges(initialState)
      return batchWrite(changes)
    case 'response-message':
      const body = JSON.parse(messagePart.body)
      const messageId = body.response_to
      const responseToNodeId = body.response_to_node_id

      return getRecord({ messageId, responseToNodeId })
        .then((existing) => {
          let initialPartId = null
          let responses = {}

          if (existing) {
            initialPartId = existing.initialPartId ? existing.initialPartId._ : null
            responses = JSON.parse(existing.responses._)
          }

          if (responses[senderId]) {
            responses[senderId] = responses[senderId].concat(body.changes)
          } else {
            responses[senderId] = body.changes
          }

          return updateRecord({ messageId, responseToNodeId }, responses)
            .then(() => {
              return { initialPartId, messageId, responseToNodeId, responses }
            })
        })
  }
}

/**
 * Get a single entry
 */
function getRecord ({ messageId, responseToNodeId }) {
  const query = new TableQuery()
    .where('PartitionKey eq ?', LayerIDK.toUUID(messageId))
    .and('RowKey eq ?', responseToNodeId)

  return new Promise((resolve, reject) => {
    return client.queryEntities(TableName, query, null, (err, res) => {
      if (err) return reject(err)

      if (res.entries.length) return resolve(res.entries[0])
      return resolve()
    })
  })
}

/**
 * Batch write operation
 */
function batchWrite (changes) {
  const operations = []
  changes.forEach(({ initialPartId, messageId, responseToNodeId, responses }) => {
    operations.push(() => {
      return insertEntity({
        PartitionKey: generator.String(LayerIDK.toUUID(messageId)),
        RowKey: generator.String(responseToNodeId),
        responses: generator.String(JSON.stringify(responses)),
        initialPartId: generator.String(initialPartId)
      })
      .catch((err) => {
        if (err.code === 'EntityAlreadyExists') return Promise.resolve()
        return Promise.reject(err)
      })
    })
  })
  return LayerIDK.promiseSerial(operations) 
    .then(() => changes)
}

/**
* Update an entry
*/
function updateRecord ({ messageId, responseToNodeId }, responses) {
  const entity = {
    PartitionKey: generator.String(LayerIDK.toUUID(messageId)),
    RowKey: generator.String(responseToNodeId),
    responses: generator.String(JSON.stringify(responses))
  }
  return new Promise((resolve, reject) => {
    return client.insertOrReplaceEntity(TableName, entity, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

/**
 * Put one entry into the db
 */
function insertEntity (entity) {
  return new Promise((resolve, reject) => {
    client.insertEntity(TableName, entity, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}
