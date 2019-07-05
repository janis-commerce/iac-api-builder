'use strict';

// IMPORTANTE: Mantener los espacios, nuevas líneas e indentación para no romper el formato yaml

/* eslint-disable*/
module.exports = ({
	methodName,
	resourceName,
	allowedHttpMethods
}) => {

	const corsTemplate = {};

	corsTemplate[methodName] = {
		Type: 'AWS::ApiGateway::Method',
		Properties: {
			ApiKeyRequired: 'false',
			HttpMethod: 'OPTIONS',
			AuthorizationType: 'NONE',
			Integration: {
				Type: 'MOCK',
				IntegrationResponses: [{
					StatusCode: '200',
					ResponseTemplates: {
						'application/json': '#set($origin = $input.params("Origin"))\\n#if($origin == "") #set($origin = $input.params("origin")) #end\\n#set($context.responseOverride.header.Access-Control-Allow-Origin = $origin)'
					},
					ResponseParameters: {
						'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Accept,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Janis-Client'",
						'method.response.header.Access-Control-Allow-Methods': `"'${['OPTIONS', ...allowedHttpMethods].join(',')}'"`,
						'method.response.header.Access-Control-Allow-Origin': "'*'",
						'method.response.header.Access-Control-Allow-Credentials': "'true'"
					}
				}],
				RequestTemplates: {
					'application/json': '{"statusCode": 200}'
				}
			},
			MethodResponses: [{
				ResponseModels: {
					'application/json': 'Empty'
				},
				ResponseParameters: {
					'method.response.header.Access-Control-Allow-Headers': true,
					'method.response.header.Access-Control-Allow-Methods': true,
					'method.response.header.Access-Control-Allow-Origin': true,
					'method.response.header.Access-Control-Allow-Credentials': true
				},
				StatusCode: '200'
			}],
			ResourceId: `!Ref ${resourceName}`,
			RestApiId: {
				'Fn::ImportValue': `
        !Sub '\${ApiGatewayStackName}-ApiGatewayId'`
			}
		}
	};

};
/* eslint-enable */
