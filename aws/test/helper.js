
const AWS = require('aws-sdk')

const config = require('../src/config')
const TableName = config.tableName()

exports.kinesisEvent = ({ responseType, conversationId, senderId, body }) => {
  return {
    Records: [
      {
        kinesis: {
          data: Buffer.from(JSON.stringify({
            responseType,
            conversationId,
            senderId,
            messagePart: { body }
          })).toString('base64')
        }
      }
    ]
  }
}

exports.createTable = () => {
  var dynamodb = new AWS.DynamoDB(config.dynamoParams())
  return dynamodb.createTable({
    TableName,
    KeySchema: [
      {
        AttributeName: 'messageId',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'responseToNodeId', 
        KeyType: 'RANGE', 
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'messageId',
        AttributeType: 'S',
      },
      {
        AttributeName: 'responseToNodeId',
        AttributeType: 'S',
      },       
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1, 
      WriteCapacityUnits: 1, 
    },
  }).promise()
}

exports.deleteTable = () => {
  var dynamodb = new AWS.DynamoDB(config.dynamoParams())
  return dynamodb.deleteTable({ TableName }).promise()
}

exports.tableCleanup = () => exports.deleteTable()
  .then(() => exports.createTable())
  .catch(() => exports.createTable())
