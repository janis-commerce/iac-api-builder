'use strict';

module.exports = ({
	resourceName,
	parentResourceName,
	resourcePathPart
}) => `
${resourceName}:
  Type: AWS::ApiGateway::Resource
  Properties:
    ParentId: ${parentResourceName ? `!Ref ${parentResourceName}` : `
      Fn::ImportValue:
        !Sub '\${ApiGatewayStackName}-ApiGatewayRootResourceId'`}
    PathPart: '${resourcePathPart}'
    RestApiId:
      Fn::ImportValue:
        !Sub '\${ApiGatewayStackName}-ApiGatewayId'
`;


/**
 *
  `
    ${resourceName}:
      Type: AWS::ApiGateway::Resource
      Properties:
        ParentId: ${parentResourceName ? `!Ref ${parentResourceName}` : `
          Fn::ImportValue:
            !Sub '\${ApiGatewayStackName}-ApiGatewayRootResourceId'`}
        PathPart: '${resourcePathPart}'
        RestApiId:
          Fn::ImportValue:
            !Sub '\${ApiGatewayStackName}-ApiGatewayId'
  `;


const resourceTemplate = {};

	const importValue = {
		'Fn::ImportValue': '!Sub \'${ApiGatewayStackName}-ApiGatewayRootResourceId\''
	};

	const ref = `!Ref ${parentResourceName}`;

	const ParentId = parentResourceName ? ref : importValue;

	resourceTemplate[resourceName] = {
		Type: 'AWS::ApiGateway::Resource',
		Properties: {
			ParentId,
			PathPart: resourcePathPart,
			RestApiId: {
				'Fn::ImportValue': '!Sub \'${ApiGatewayStackName}-ApiGatewayId\''
			}
		}
	};

	return resourceTemplate;

 */
