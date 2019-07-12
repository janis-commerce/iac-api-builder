# iac-api-builder

[![Build Status](https://travis-ci.org/janis-commerce/iac-api-builder.svg?branch=JCN-104-iac-api-builder)](https://travis-ci.org/janis-commerce/iac-api-builder)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/iac-api-builder/badge.svg?branch=JCN-104-iac-api-builder)](https://coveralls.io/github/janis-commerce/iac-api-builder?branch=JCN-104-iac-api-builder)

Builds API Gateway Yaml File from API Schemas Json file.

## Usage

In the console

```sh
npx @janiscommerce/iac-api-builder
```

* Must be Built API-Schemas first. See [API-Schema-Builder](https://github.com/janis-commerce/api-schema-builder), in `root/schemas/public.json`
* Create File in `root/iac/build/api-gateway.yml`

