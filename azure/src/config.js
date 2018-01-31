'use strict'

const configJSON = process.env.LAYER_CONFIG ? require(process.env.LAYER_CONFIG) : require('./layer_config.json')
const serviceName = configJSON.service_name || 'layer-message-responses'

exports.tableName = () => serviceName.replace(/-/g, '')
exports.tableDBAccountName = () => configJSON.storage_account_name
exports.tableDBAccessKey = () => configJSON.storage_access_key
