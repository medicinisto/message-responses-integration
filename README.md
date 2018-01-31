# Message Responses Integration
[![Build Status](https://circleci.com/gh/layerhq/message-responses-integration.png?circle-token=8144c9bfcbf48b7a0f0f2f372753c2b814de82b5)](https://circleci.com/gh/layerhq/message-responses-integration)

Message Responses Integration, built using the Layer [Integration Development Kit](https://preview-docs.layer.com/reference/integrations/framework). A stateful serverless way to maintain states for message responses on AWS and Azure using
Serverless framework.

## Prerequisites

[Serverless](https://serverless.com) toolkit and [layer-integrations](https://github.com/layerhq/layer-integrations) command line tool.

    sudo npm install -g serverless layer-integrations

## Cloud Providers

This integration can be deployed one of the following cloud providers:

- [Amazon AWS](./aws)
- [Microsoft Azure](./azure)
