'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const appendFile = promisify(fs.appendFile);

// const IacApiBuilderError = require('./iac-api-builder-error');

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
		console.error(`[\x1b[35m \x1b[1mIAC-API--BUILDER\x1b[0m | ${time} ] | \x1b[31mERROR\x1b[0m | Abort. Can't create IAC-API.\n`);
	} else
		console.log(`[\x1b[35m \x1b[1mIAC-API--BUILDER\x1b[0m | ${time} ] | \x1b[32m${prefix}\x1b[0m | ${message}`);
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

	get getSchemasJSON() {
		/* eslint-disable global-require, import/no-dynamic-require */
		return require(this.constructor.schemasJSON);
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


		if(!await this.exists(this.constructor.sourceFilePath))
			return logger('[IaC] API Gateway template built', 'SUCCESS');

		if(!await this.exists(this.constructor.schemasJSON))
			return logger(`API-Schemas file does not exist: ${this.constructor.schemasJSON}`, 'ERROR', true);

		const schema = this.getSchemasJSON;

		if(!await this.exists(this.constructor.resourceTemplateFilePath))
			return logger(`Resources template file does not exist: ${this.constructor.resourceTemplateFilePath}`, 'ERROR', true);

		if(!await this.exists(this.constructor.methodTemplateFilePath))
			return logger(`Methods template file does not exist: ${this.constructor.methodTemplateFilePath}`, 'ERROR', true);

		if(!await this.exists(this.constructor.corsTemplateFilePath))
			return logger(`Methods template file does not exist: ${this.constructor.corsTemplateFilePath}`, 'ERROR', true);

		try {
			await this.initBuiltFile();
		} catch(error) {
			logger(`Can't copy Files. ${error.message}`, 'ERROR', true);
		}

		const paths = schema.paths ? Object.entries(schema.paths) : [];

		if(!paths)
			return logger('No paths to build', 'ERROR', true);

		try {
			for(const [apiPath, apiPathData] of paths)
				await this.buildPath(apiPath, apiPathData);

		} catch(error) {
			logger(`Can't build Files. ${error.message}`, 'ERROR', true);
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
			await stat(filePath);
			return true;
		} catch(error) {
			return false;
		}
	}

	/**
	 * Copy the Source File to Build directory
	 */
	async initBuiltFile() {
		await copyFile(this.constructor.sourceFilePath, this.constructor.buildFilePath);
	}

	async buildPath(apiPath, apiPathData) {

		this.buildResources(apiPath);
		await this.buildAllMethods(apiPath, apiPathData);
	}

	buildResources(apiPath) {

		const resourcePathParts = [];

		for(const pathPart of apiPath.split('/')) {
			if(pathPart !== '') {

				const parentPath = resourcePathParts.join('/');
				resourcePathParts.push(pathPart);

				this.buildResource(resourcePathParts, parentPath, async resource => {

					if(!resource)
						return;

					await this.appendToTemplate(resource);
					createdResources[this.getResourceName(resourcePathParts.join('/'))] = true;
				});

			}
		}
	}

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

	async handleBuiltMethod(method, apiPath, httpMethod) {

		if(!method)
			return;

		await this.appendToTemplate(method);
		createdMethods[this.getMethodName(apiPath, httpMethod)] = true;
	}

	async handleBuiltCors(cors, apiPath) {

		if(!cors)
			return;

		await this.appendToTemplate(cors);
		createdMethods[this.getMethodName(apiPath, 'OPTIONS')] = true;
	}

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

	buildResource(resourcePathParts, parentPath, callback) {

		const resourceName = this.getResourceName(resourcePathParts.join('/'));

		if(createdResources[resourceName])
			return callback();

		const resourcePathPart = resourcePathParts[resourcePathParts.length - 1];

		/* eslint-disable global-require, import/no-dynamic-require */
		const resource = require(this.constructor.resourceTemplateFilePath)({
			parentResourceName: parentPath !== '' ? this.getResourceName(parentPath) : '',
			resourceName,
			resourcePathPart
		});
		/* eslint-enable */

		return callback(resource);
	}

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

	async appendToTemplate(resource) {
		await appendFile(this.constructor.buildFilePath, resource);
	}

}

module.exports = IacApiBuilder;