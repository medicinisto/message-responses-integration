const azure = require('azure-storage')

const config = require('../config')
const TableName = config.tableName()

const client = azure.createTableService(config.tableDBAccountName(), config.tableDBAccessKey())
client.createTableIfNotExists(TableName, (err, data) => {
  if (err) console.log(err)
})
