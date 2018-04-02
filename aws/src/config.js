'use strict'

const configJSON = require(process.env.LAYER_CONFIG || './layer_config.json')

exports.tableName = () => configJSON.service_name || 'layer-message-responses'

exports.dynamoParams = () => process.env.NODE_ENV === 'test' ? {
  region: 'localhost',
  endpoint: 'http://localhost:8000'
} : {}

exports.kinesisArn = () => configJSON.kinesis_arn
exports.kinesisShards = () => configJSON.kinesis_shards
exports.kinesisStreamName = () => {
  if (!configJSON.kinesis_arn) return null
  return configJSON.kinesis_arn.substring(configJSON.kinesis_arn.indexOf('/') + 1)
}
