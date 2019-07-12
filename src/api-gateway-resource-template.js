'use strict';

module.exports = ({
	resourceName,
	parentResourceName,
	resourcePathPart
}) => {
	const resourceTemplate = {};
	/* eslint-disable*/
	const importValue = {
		'Fn::ImportValue': `\n!Sub '\${ApiGatewayStackName}-ApiGatewayRootResourceId'`
	};

	const ref = `\n!Ref ${parentResourceName}`;

	const ParentId = parentResourceName ? ref : importValue;

	resourceTemplate[resourceName] = {
		Type: 'AWS::ApiGateway::Resource',
		Properties: {
			ParentId,
			PathPart: resourcePathPart,
			RestApiId: {
				'Fn::ImportValue': `\n!Sub '\${ApiGatewayStackName}-ApiGatewayId'`
			}
		}
	};
	/* eslint-enable */
	return resourceTemplate;
};
