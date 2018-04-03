# Message Responses Integration

Message Responses Integration, built using the Layer [Integration Development Kit](https://preview.layer.com/reference/integrations/framework).

## Microsoft Azure

Make sure you configure [Azure Credentials](https://serverless.com/framework/docs/providers/azure/guide/credentials/) before deploying the integration.

## Deploy

Run the following command to deploy your integration:

    layer-integrations deploy

Read more on how to access Serverless [function logs](https://serverless.com/framework/docs/providers/azure/cli-reference/logs/) so you can monitor your integration.

## Requirements

1. Create a [Storage Account](https://docs.microsoft.com/en-us/azure/storage/common/storage-introduction). (Please do not get confused with Azure Cosmos DB)
2. Goto `Access Keys` section in your newly created Storage Account
3. Get the `Storage account name` (storage_account_name) and `KEY` (storage_access_key). You may chose any one of the keys (key1 or key2).

## Webpack

We are using webpack to bundle the packages in azure as serverless does not provide a good way to package and upload local and private npm dependencies. We need to refrence the `dist/bundle` in the `serverless.yml` file so that it is linked to the build files on azure.
