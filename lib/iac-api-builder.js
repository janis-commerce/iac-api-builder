'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const YAML = require('yaml');

// Promisify Methods
['stat', 'copyFile', 'appendFile', 'readFile'].forEach(method => {
	fs[method] = promisify(fs[method]);
});

const camelize = (text, separator = '/') => {
	return text.split(separator)
		.map(w => w.replace(/./, m => m.toUpperCase()))
		.join('');
};

const createdResources = {};
const createdMethods = {};

const IAC_DIRECTORY = 'iac';
const SRC_DIRECTORY = 'src';
const BUILD_DIRECTORY = 'build';
const SCHEMAS_DIRECTORY = 'schemas';

const BUILD_FILE = 'api-gateway.yml';
const SOURCE_FILE = 'api-gateway.yml';
const RESOURCE_TEMPLATE = 'api-gateway-resource-template.js';
const METHOD_TEMPLATE = 'api-gateway-method-template.js';
const CORS_TEMPLATE = 'api-gateway-cors-method-template.js';
const SCHEMAS_JSON = 'public.json';

/**
 * Simple Console Log
 * @param {string} message
 * @param {string} prefix DEFAULT = 'BUILDING'
 * @param {boolean} error if it's an error message
 */
/* istanbul ignore next */
const logger = (message, prefix = 'BUILDING', error = false) => {
	const time = new Date().toLocaleTimeString();

	/*
		/x1b[**m -> text editor codes
		/x1b[35m = Magenta
		/x1b[32m = Green
		/x1b[31m = Red
		/x1b[1m = Bright
		/x1b[0m = Reset, back to normal
	 */

	if(error) {
		console.error(`[\x1b[35m \x1b[1mIAC-API-BUILDER\x1b[0m | ${time} ] | \x1b[31m${prefix}\x1b[0m | ${message}`);
		console.error(`[\x1b[35m \x1b[1mIAC-API-BUILDER\x1b[0m | ${time} ] | \x1b[31mERROR\x1b[0m | Abort. Can't create IAC-API.\n`);
	} else
		console.log(`[\x1b[35m \x1b[1mIAC-API-BUILDER\x1b[0m | ${time} ] | \x1b[32m${prefix}\x1b[0m | ${message}`);
};

/**
 * Buildea el template de Cloud formation, con todos los endpoints disponibles
 *
 * @class IacApiBuilder IaC API Builder
 */
class IacApiBuilder {

	static get sourceFilePath() {
		return path.join(__dirname, '..', SRC_DIRECTORY, SOURCE_FILE);
	}

	static get resourceTemplateFilePath() {
		return path.join(__dirname, '..', SRC_DIRECTORY, RESOURCE_TEMPLATE);
	}

	static get methodTemplateFilePath() {
		return path.join(__dirname, '..', SRC_DIRECTORY, METHOD_TEMPLATE);
	}

	static get corsTemplateFilePath() {
		return path.join(__dirname, '..', SRC_DIRECTORY, CORS_TEMPLATE);
	}

	static get buildFilePath() {
		return path.join(process.cwd(), IAC_DIRECTORY, BUILD_DIRECTORY, BUILD_FILE);
	}

	static get schemasJSON() {
		return path.join(process.cwd(), SCHEMAS_DIRECTORY, SCHEMAS_JSON);
	}

	static get httpMethods() {
		return ['get', 'post', 'put', 'patch', 'delete'];
	}

	getResourceName(fullPath) {
		return `ApiGatewayResource${camelize(fullPath.replace(/[{}]/g, ''), /[_/-]/)}`;
	}

	getMethodName(fullPath, httpMethod) {
		return `ApiGatewayMethod${camelize(fullPath.replace(/[{}]/g, ''), /[_/-]/)}${camelize(httpMethod.toLowerCase())}`;
	}

	/**
	 * Build the API Gateway template.
	 */
	async build() {

		logger('Building [IaC] API Gateway', 'START');

		if(!await this.exists(this.constructor.schemasJSON))
			return logger(`API-Schemas file does not exist: '${this.constructor.schemasJSON}'.`, 'ERROR', true);

		logger(`API-Schemas file found in '${this.constructor.schemasJSON}'.`);

		let schema;
		try {
			schema = await this.getSchemasJSON();
		} catch(error) {
			return logger(`File '${this.constructor.schemasJSON}' but Invalid JSON. Error: ${error.message}.`, 'ERROR', true);
		}

		logger('Copying Files.');

		try {
			await this.initBuiltFile();
		} catch(error) {
			return logger(`Can't copy Files. Error: ${error.message}.`, 'ERROR', true);
		}

		logger(`Copied Files to '${this.constructor.buildFilePath}'.`);

		const paths = schema.paths ? Object.entries(schema.paths) : [];

		if(!paths.length)
			return logger('No paths to build', 'ERROR', true);

		logger('Paths Found. Init Build.');

		try {
			for(const [apiPath, apiPathData] of paths)
				await this.buildPath(apiPath, apiPathData);

		} catch(error) {
			return logger(`Can't build Files. Error: ${error.message}`, 'ERROR', true);
		}

		return logger('[IaC] API Gateway template built', 'SUCCESS');
	}

	/**
	 * Return if exist or not a File or directory asynchronously
	 * @param {string} filePath Path of File
	 * @returns {Promise<boolean>}
	 */
	async exists(filePath) {

		try {
			await fs.stat(filePath);
			return true;
		} catch(error) {
			return false;
		}
	}

	/**
	 * Get the Schemas to be build.
	 * @returns {object}
	 */
	async getSchemasJSON() {
		const schemas = await fs.readFile(this.constructor.schemasJSON);
		return JSON.parse(schemas);
	}

	/**
	 * Copy the Source File to Build directory
	 */
	async initBuiltFile() {
		await fs.copyFile(this.constructor.sourceFilePath, this.constructor.buildFilePath);
	}

	/**
	 * Build Resources and Methods and append to the build file
	 * @param {string} apiPath Path
	 * @param {object} apiPathData Data
	 */
	async buildPath(apiPath, apiPathData) {

		await this.buildResources(apiPath);
		await this.buildAllMethods(apiPath, apiPathData);
	}

	/**
	 * Build Resources, and append to the file
	 * @param {string} apiPath Path
	 */
	async buildResources(apiPath) {

		const resourcePathParts = [];

		for(const pathPart of apiPath.split('/')) {
			if(pathPart !== '') {

				const parentPath = resourcePathParts.join('/');
				resourcePathParts.push(pathPart);

				const resource = this.buildResource(resourcePathParts, parentPath);

				if(!resource)
					continue;

				await this.appendToTemplate(resource);
				createdResources[this.getResourceName(resourcePathParts.join('/'))] = true;

			}
		}
	}

	/**
	 * Build Methods
	 * @param {string} apiPath Path
	 * @param {object} apiPathData Data
	 */
	async buildAllMethods(apiPath, apiPathData) {

		const allowedHttpMethods = [];

		for(const httpMethod of this.constructor.httpMethods) {

			if(apiPathData[httpMethod]) {
				const method = this.buildMethod(apiPath, httpMethod, apiPathData[httpMethod]);
				await this.handleBuiltMethod(method, apiPath, httpMethod);

				if(apiPathData['x-janis-allow-cors'])
					allowedHttpMethods.push(httpMethod.toUpperCase());
			}
		}

		if(apiPathData['x-janis-allow-cors']) {

			const cors = this.buildCors(apiPath, allowedHttpMethods);
			await this.handleBuiltCors(cors, apiPath);
		}

	}

	/**
	 * Append Method Object to build file.
	 * @param {object} method Object ready to by parser to YAML
	 * @param {string} apiPath
	 * @param {string} httpMethod
	 */
	async handleBuiltMethod(method, apiPath, httpMethod) {

		await this.appendToTemplate(method);
		createdMethods[this.getMethodName(apiPath, httpMethod)] = true;
	}

	/**
	 * Append Cors Object to build file
	 * @param {object} cors Object ready to by parser to YAML
	 * @param {string} apiPath
	 */
	async handleBuiltCors(cors, apiPath) {

		await this.appendToTemplate(cors);
		createdMethods[this.getMethodName(apiPath, 'OPTIONS')] = true;
	}

	/**
	 * Get the Data and transform into a Method Object
	 * @param {string} apiPath
	 * @param {string} httpMethod
	 * @param {object} apiData
	 * @returns {object}
	 */
	buildMethod(apiPath, httpMethod, apiData) {

		const needsAuthentication = apiData.security && apiData.security.length;

		/* eslint-disable global-require, import/no-dynamic-require */
		const method = require(this.constructor.methodTemplateFilePath)({
			apiPath,
			httpMethod,
			methodName: this.getMethodName(apiPath, httpMethod),
			needsAuthentication,
			resourceName: this.getResourceName(apiPath),
			parameters: apiData.parameters || []
		});
		/* eslint-enable */

		return method;
	}

	/**
	 * Get the Data and transform into a Resource Object
	 * @param {string} resourcePathParts
	 * @param {string} parentPath
	 * @returns {object}
	 */
	buildResource(resourcePathParts, parentPath) {

		const resourceName = this.getResourceName(resourcePathParts.join('/'));

		if(createdResources[resourceName])
			return;

		const resourcePathPart = resourcePathParts[resourcePathParts.length - 1];

		/* eslint-disable global-require, import/no-dynamic-require */
		const resource = require(this.constructor.resourceTemplateFilePath)({
			parentResourceName: parentPath !== '' ? this.getResourceName(parentPath) : '',
			resourceName,
			resourcePathPart
		});
		/* eslint-enable */

		return resource;
	}

	/**
	 * Get the Data and transform into a Cors Object
	 * @param {string} apiPath
	 * @param {string} allowedHttpMethods
	 * @returns {object}
	 */
	buildCors(apiPath, allowedHttpMethods) {

		/* eslint-disable global-require, import/no-dynamic-require */
		const corsMethod = require(this.constructor.corsTemplateFilePath)({
			allowedHttpMethods,
			methodName: this.getMethodName(apiPath, 'OPTIONS'),
			resourceName: this.getResourceName(apiPath)
		});
		/* eslint-enable */

		return corsMethod;
	}

	/**
	 * Parse Data into YAML and append to build file
	 * @param {object} resource
	 */
	async appendToTemplate(resource) {

		await fs.appendFile(this.constructor.buildFilePath, YAML.stringify(resource));
	}

}

module.exports = IacApiBuilder;
