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
