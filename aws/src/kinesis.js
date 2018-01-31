'use strict'

const AWS = require('aws-sdk')
AWS.config.setPromisesDependency(Promise)
const kinesis = new AWS.Kinesis()

const config = require('./config')

const shards = config.kinesisShards()
const StreamName = config.kinesisStreamName()

exports.insert = (payload) => {
  const PartitionKey = `shard-${Math.floor(Math.random() * shards) + 1}`

  return kinesis.putRecord({
    Data: JSON.stringify(payload),
    PartitionKey,
    StreamName
  }).promise()
}
