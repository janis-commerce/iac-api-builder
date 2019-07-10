'use strict';

// IMPORTANTE: Mantener los espacios, nuevas líneas e indentación para no romper el formato yaml

const locations = {
	path: 'path'
};

const getParameterLocation = schemaLocation => {
	return locations[schemaLocation] || null;
};

const buildParameter = (parameter, target) => {

	if(target === 'request') {
		return [
			`method.request.${getParameterLocation(parameter.in)}.${parameter.name}`,
			parameter.required || false
		];
	}

	if(target === 'integration') {
		return [
			`integration.request.${getParameterLocation(parameter.in)}.${parameter.name}`,
			`method.request.${getParameterLocation(parameter.in)}.${parameter.name}`
		];
	}

	// return [];

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

	methodTemplate[methodName] = {
		Type: 'AWS::ApiGateway::Method',
		Properties: {
			ApiKeyRequired: needsAuthentication ? 'true' : 'false',
			HttpMethod: httpMethod.toUpperCase(),
			AuthorizationType: 'NONE',
			Integration: {
				IntegrationHttpMethod: httpMethod.toUpperCase(),
				Type: 'HTTP_PROXY',
				Uri: `!Sub \${TargetDomain}/api${apiPath}`,
				RequestParameters: buildParameters(parameters, 'integration')
			},
			ResourceId: `!Ref ${resourceName}`,
			RestApiID: {
				'Fn::ImportValue': `
          !Sub '\${ApiGatewayStackName}-ApiGatewayId'`
			},
			RequestParameters: buildParameters(parameters, 'request')
		}
	};

	return methodTemplate;
};

/**
 * `
  ${methodName}:
    Type: AWS::ApiGateway::Method
    Properties:
      ApiKeyRequired: ${needsAuthentication ? 'true' : 'false'}
      HttpMethod: ${httpMethod.toUpperCase()}
      AuthorizationType: NONE
      Integration:
        IntegrationHttpMethod: ${httpMethod.toUpperCase()}
        Type: HTTP_PROXY
        Uri: !Sub \${TargetDomain}/api${apiPath}
        ${buildParameters(parameters, 'integration')}
      ResourceId: !Ref ${resourceName}
      RestApiId:
        Fn::ImportValue:
          !Sub '\${ApiGatewayStackName}-ApiGatewayId'
      ${buildParameters(parameters, 'request')}
`;
 */
