'use strict';

module.exports = ({
	resourceName,
	parentResourceName,
	resourcePathPart
}) => {
	const resourceTemplate = {};

	const importValue = {
		'Fn::ImportValue': `
		!Sub! '\${ApiGatewayStackName}-ApiGatewayRootResourceId'`
	};

	const ref = `!Ref ${parentResourceName}`;

	const ParentId = parentResourceName ? ref : importValue;

	resourceTemplate[resourceName] = {
		Type: 'AWS::ApiGateway::Resource',
		Properties: {
			ParentId,
			PathPart: resourcePathPart,
			RestApiId: {
				'Fn::ImportValue': `
				!Sub '\${ApiGatewayStackName}-ApiGatewayId'`
			}
		}
	};

	return resourceTemplate;
};


/**
 *
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

const YAML1 = require('json2yaml');
const YAML2 = require('js-yaml');
const YAML3 = require('yaml');
const YAML4 = require('yamljs');
const YAML5 = require('tap-yaml');
const { yamlDump, schema, yamlParse } = require('yaml-cfn');


const makeResourceValue = ({
	resourceName,
	parentResourceName,
	resourcePathPart
}) => {

	const original = `
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
		'Fn::ImportValue': '\n!Sub! \'${ApiGatewayStackName}-ApiGatewayRootResourceId\''
	};

	const ref = `!Ref ${parentResourceName}`;

	const ParentId = parentResourceName ? ref : importValue;

	resourceTemplate[resourceName] = {
		Type: 'AWS::ApiGateway::Resource',
		Properties: {
			ParentId,
			PathPart: resourcePathPart,
			RestApiId: { 'Fn::ImportValue': { 'Fn::Sub': '\'${ApiGatewayStackName}-ApiGatewayId\'' } }
		}
	};

	const parsed = {
		Key: [
		  { 'Fn::GetAtt': ['Foo', 'Bar'] },
		  { 'Fn::Equals': [{ '!Sub': 'Baz' }, 'hello'] }
		]
	  };

	console.log(JSON.stringify(resourceTemplate, null, '\t'));
	// console.log(yamlParse(original).local.Properties);
	// console.log(YAML4.parse(original).local);
	// console.log(YAML4.stringify(resourceTemplate, 6, 4));
	// console.log(YAML3.stringify(resourceTemplate, { keepCstNodes: true }));
	// console.log(YAML1.stringify(resourceTemplate));
	// console.log(yamlDump(resourceTemplate));
	// console.log(yamlDump(parsed));
	console.log(YAML3.stringify(resourceTemplate));
};

const templateValues = {
	resourceName: 'local',
	parentResourceName: '',
	resourcePathPart: 'gas'
};

makeResourceValue(templateValues);

 */
