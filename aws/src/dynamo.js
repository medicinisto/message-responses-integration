'use strict'

// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-example-document-client.html
const AWS = require('aws-sdk')
const Responses = require('common/responses')

const config = require('./config')

AWS.config.setPromisesDependency(Promise)

const docClient = new AWS.DynamoDB.DocumentClient(config.dynamoParams())
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
          let responses = existing ? existing.responses : {}
          if (responses[senderId]) {
            responses[senderId] = responses[senderId].concat(body.changes)
          } else {
            responses[senderId] = body.changes
          }
          return updateRecord({ messageId, responseToNodeId }, responses)
        })
  }
}

/**
 * Batch write operation
 */
function batchWrite (changes) {
  return docClient.batchWrite({
    RequestItems: {
      [TableName]: changes.map(({
        initialPartId,
        messageId,
        responseToNodeId,
        responses
      }) => {
        return {
          PutRequest: {
            Item: {
              initialPartId,
              messageId,
              responseToNodeId,
              responses
            }
          }
        }
      })
    }
  }).promise().then(() => changes)
}

/**
 * Get a single entry
 */
function getRecord ({ messageId, responseToNodeId }) {
  return docClient.get({
    TableName,
    Key: {
      messageId,
      responseToNodeId
    }
  }).promise().then(({ Item }) => Item)
}

/**
* Update an entry
*/
function updateRecord ({ messageId, responseToNodeId }, responses) {
  return docClient.update({
    TableName,
    Key: {
      messageId,
      responseToNodeId
    },
    UpdateExpression: 'SET responses = :r',
    ExpressionAttributeValues: {
      ':r': responses
    },
    ReturnValues: 'ALL_NEW'
  }).promise().then(({ Attributes }) => Attributes)
}
