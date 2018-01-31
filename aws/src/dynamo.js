'use strict'

const AWS = require('aws-sdk')

const config = require('./config')

AWS.config.setPromisesDependency(Promise)

// https://docs.aws.amazon.com/amazondynamodb/latest/gettingstartedguide/GettingStarted.NodeJs.html
const docClient = new AWS.DynamoDB.DocumentClient()
const TableName = config.tableName()

/**
 * Get a single entry
 */
const getRecord = (data) => {
  if (!data) return Promise.resolve({})
  const responsePart = data.responsePart
  const body = JSON.parse(responsePart.body)
  const messageId = body.response_to
  const responseToNodeId = body.response_to_node_id
  const record = {
    TableName,
    Key: {
      messageId,
      responseToNodeId
    }
  }
  return docClient.get(record).promise()
}

/**
 * Put one entry into the db
 */
const setRecord = (data) => {
  const responsePart = data.responsePart
  const body = JSON.parse(responsePart.body)
  const messageId = body.response_to
  const responseToNodeId = body.response_to_node_id
  const responses = {
    [data.senderId]: responsePart
  }
  const record = {
    TableName,
    Item: {
      messageId,
      responseToNodeId,
      responses
    }
  }
  return docClient.put(record).promise()
}

/**
* Update an entry in dynamodb
*/
const updateRecord = (existingRecord, data) => {
  const responsePart = data.responsePart
  const body = JSON.parse(responsePart.body)
  const messageId = body.response_to
  const responseToNodeId = body.response_to_node_id
  let responses = existingRecord.Item && existingRecord.Item.responses
    ? existingRecord.Item.responses : null
  if (!responses) return Promise.resolve(null)

  let existingRecordFromDB = responses[data.senderId] || {}
  let existingBody = existingRecordFromDB.body ? JSON.parse(existingRecordFromDB.body) : {}
  let participantData = existingBody.participant_data ? existingBody.participant_data : {}

  let finalParticipantData = Object.assign({}, participantData, body.participant_data)
  body.participant_data = finalParticipantData
  responsePart.body = JSON.stringify(body)

  responses[data.senderId] = responsePart
  const record = {
    TableName,
    Key: {
      messageId,
      responseToNodeId
    },
    UpdateExpression: 'set responses = :r',
    ExpressionAttributeValues: {
      ':r': responses
    },
    ReturnValues: 'UPDATED_NEW'
  }
  return docClient.update(record).promise()
}

exports.store = (data) => {
  return getRecord(data)
    .then((res) => {
      if (!Object.keys(res).length) return setRecord(data)
      return updateRecord(res, data)
    })
    .then(() => getRecord(data))
    .then(({ Item }) => Item ? Item.responses : null)
}
