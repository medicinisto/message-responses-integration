'use strict'

const azure = require('azure-storage')
const LayerIDK = require('@layerhq/idk')

const config = require('./config')

const client = azure.createTableService(config.tableDBAccountName(), config.tableDBAccessKey())
const generator = azure.TableUtilities.entityGenerator

const TableName = config.tableName()

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

const setRecord = (data) => {
  const responsePart = data.responsePart
  const body = JSON.parse(responsePart.body)
  const messageId = LayerIDK.toUUID(body.response_to)
  const responseToNodeId = LayerIDK.toUUID(body.response_to_node_id)
  const responses = {
    [data.senderId]: responsePart
  }
  const record = {
    PartitionKey: generator.String(messageId),
    RowKey: generator.String(responseToNodeId),
    responses: generator.String(JSON.stringify(responses))
  }
  return insertEntity(record)
}

/**
 * Get a single entry
 */
function queryTable (messageId, responseToNodeId) {
  const query = new azure.TableQuery()
    .where('PartitionKey eq ?', messageId)
    .and('RowKey eq ?', responseToNodeId)
  return new Promise((resolve, reject) => {
    return client.queryEntities(TableName, query, null, (err, res) => {
      if (err) return reject(err)
      const entries = res.entries
      if (Array.isArray(entries) && entries.length > 0) {
        return resolve(entries[0])
      }
      return resolve({})
    })
  })
}

function replaceRecord (messageId, responseToNodeId, responses) {
  const entity = {
    PartitionKey: generator.String(LayerIDK.toUUID(messageId)),
    RowKey: generator.String(responseToNodeId),
    responses: generator.String(JSON.stringify(responses))
  }
  return new Promise((resolve, reject) => {
    return client.replaceEntity(TableName, entity, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

const getRecord = (data) => {
  const responsePart = data.responsePart
  const body = JSON.parse(responsePart.body)
  const messageId = LayerIDK.toUUID(body.response_to)
  const responseToNodeId = body.response_to_node_id
  return queryTable(messageId, responseToNodeId)
}

/**
* Update an entry
*/
const updateRecord = (existingRecord, data) => {
  const responsePart = data.responsePart
  const body = JSON.parse(responsePart.body)
  const messageId = body.response_to
  const responseToNodeId = body.response_to_node_id
  let responses = existingRecord && existingRecord.responses
    ? JSON.parse(existingRecord.responses._) : null
  if (!responses) return Promise.resolve(null)

  let existingRecordFromDB = responses[data.senderId] || {}
  let existingBody = existingRecordFromDB.body ? JSON.parse(existingRecordFromDB.body) : {}
  let participantData = existingBody.participant_data ? existingBody.participant_data : {}

  let finalParticipantData = Object.assign({}, participantData, body.participant_data)
  body.participant_data = finalParticipantData
  responsePart.body = JSON.stringify(body)

  responses[data.senderId] = responsePart

  return replaceRecord(messageId, responseToNodeId, responses)
}

exports.store = (data) => {
  return getRecord(data)
    .then((record) => {
      if (Object.keys(record).length === 0) return setRecord(data)
      else return updateRecord(record, data)
    })
    .then(() => getRecord(data))
    .then(({ responses }) => {
      if (!responses || !Object.keys(responses).length) return null
      return JSON.parse(responses._)
    })
}
