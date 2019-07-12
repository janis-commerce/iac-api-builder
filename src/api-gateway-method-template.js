'use strict';

// IMPORTANTE: Mantener los espacios, nuevas líneas e indentación para no romper el formato yaml

const locations = {
	path: 'path'
};

const getParameterLocation = schemaLocation => {
	return locations[schemaLocation] || null;
};

const buildParameter = (parameter, target) => {

	const request = {
		request: [
			`method.request.${getParameterLocation(parameter.in)}.${parameter.name}`,
			parameter.required || false
		],
		integration: [
			`integration.request.${getParameterLocation(parameter.in)}.${parameter.name}`,
			`method.request.${getParameterLocation(parameter.in)}.${parameter.name}`
		]
	};

	return request[target];

};

const buildParameters = (parameters, target) => {

	if(!parameters || !parameters.length)
		return '';

	parameters = parameters.filter(parameter => parameter.in && parameter.name && getParameterLocation(parameter.in));

	if(!parameters.length)
		return '';

	const formattedParameters = {};
	for(const parameter of parameters) {
		const [parameterKey, parameterValue] = buildParameter(parameter, target);
		formattedParameters[parameterKey] = parameterValue;
	}
	console.log(JSON.stringify(formattedParameters));
	return JSON.stringify(formattedParameters);
};

module.exports = ({
	apiPath,
	httpMethod,
	methodName,
	needsAuthentication,
	resourceName,
	parameters
}) => {
	const methodTemplate = {};
	/* eslint-disable*/
	methodTemplate[methodName] = {
		Type: 'AWS::ApiGateway::Method',
		Properties: {
			ApiKeyRequired: needsAuthentication ? 'true' : 'false',
			HttpMethod: httpMethod.toUpperCase(),
			AuthorizationType: 'NONE',
			Integration: {
				IntegrationHttpMethod: httpMethod.toUpperCase(),
				Type: 'HTTP_PROXY',
				Uri: `\n!Sub '\${TargetDomain}/api${apiPath}'`
			},
			ResourceId: `\n!Ref ${resourceName}`,
			RestApiID: {
				'Fn::ImportValue': `\n!Sub '\${ApiGatewayStackName}-ApiGatewayId'`
			}
		}
	};
	/* eslint-enable */
	if(buildParameters(parameters, 'integration'))
		methodTemplate[methodName].Properties.Integration.RequestParameters = `\n${buildParameters(parameters, 'integration')}`;

	if(buildParameters(parameters, 'request'))
		methodTemplate[methodName].Properties.RequestParameters = `\n${buildParameters(parameters, 'request')}`;

	return methodTemplate;
};
