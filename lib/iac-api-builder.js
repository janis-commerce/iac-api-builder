'use strict';

const fs = require('fs');
const path = require('path');
// const IacApiBuilderError = require('./iac-api-builder-error');

const camelize = (text, separator = '/') => {
	return text.split(separator)
		.map(w => w.replace(/./, m => m.toUpperCase()))
		.join('');
};

const createdResources = {};
const createdMethods = {};

/**
 * Buildea el template de Cloud formation, con todos los endpoints disponibles
 *
 * @class IacApiBuilder IaC API Builder
 */
class IacApiBuilder {

	static get sourceFilePath() {
		return path.join(__dirname, '..', '..', '..', 'iac', 'src', 'api-gateway.yml');
	}

	static get resourceTemplateFilePath() {
		return path.join(__dirname, '..', '..', '..', 'iac', 'src', 'api-gateway-resource-template.js');
	}

	static get methodTemplateFilePath() {
		return path.join(__dirname, '..', '..', '..', 'iac', 'src', 'api-gateway-method-template.js');
	}

	static get corsTemplateFilePath() {
		return path.join(__dirname, '..', '..', '..', 'iac', 'src', 'api-gateway-cors-method-template.js');
	}

	static get buildFilePath() {
		return path.join(__dirname, '..', '..', '..', 'iac', 'build', 'api-gateway.yml');
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

	build(schema, buildProcessCallback) {

		if(!this.sourceFileExists())
			return buildProcessCallback();

		if(!this.resourceTemplateFileExists())
			return buildProcessCallback(`Resources template file does not exist: ${this.constructor.resourceTemplateFilePath}`);

		if(!this.methodTemplateFileExists())
			return buildProcessCallback(`Methods template file does not exist: ${this.constructor.methodTemplateFilePath}`);

		if(!this.corsTemplateFileExists())
			return buildProcessCallback(`Methods template file does not exist: ${this.constructor.methodTemplateFilePath}`);

		this.initBuiltFile();

		const paths = schema.paths ? Object.entries(schema.paths) : [];

		if(!paths)
			return buildProcessCallback('No paths to build');

		for(const [apiPath, apiPathData] of paths)
			this.buildPath(apiPath, apiPathData);

		return buildProcessCallback();
	}

	sourceFileExists() {
		return fs.existsSync(this.constructor.sourceFilePath);
	}

	resourceTemplateFileExists() {
		return fs.existsSync(this.constructor.resourceTemplateFilePath);
	}

	methodTemplateFileExists() {
		return fs.existsSync(this.constructor.methodTemplateFilePath);
	}

	corsTemplateFileExists() {
		return fs.existsSync(this.constructor.corsTemplateFilePath);
	}

	initBuiltFile() {
		fs.copyFileSync(this.constructor.sourceFilePath, this.constructor.buildFilePath);
	}

	buildPath(apiPath, apiPathData) {

		this.buildResources(apiPath);
		this.buildAllMethods(apiPath, apiPathData);
	}

	buildResources(apiPath) {

		const resourcePathParts = [];

		for(const pathPart of apiPath.split('/')) {
			if(pathPart !== '') {

				const parentPath = resourcePathParts.join('/');
				resourcePathParts.push(pathPart);

				this.buildResource(resourcePathParts, parentPath, resource => {

					if(!resource)
						return;

					this.appendToTemplate(resource);
					createdResources[this.getResourceName(resourcePathParts.join('/'))] = true;
				});

			}
		}
	}

	buildAllMethods(apiPath, apiPathData) {

		const allowedHttpMethods = [];

		for(const httpMethod of this.constructor.httpMethods) {

			if(apiPathData[httpMethod]) {
				const method = this.buildMethod(apiPath, httpMethod, apiPathData[httpMethod]);
				this.handleBuiltMethod(method, apiPath, httpMethod);

				if(apiPathData['x-janis-allow-cors'])
					allowedHttpMethods.push(httpMethod.toUpperCase());
			}

		}

		if(apiPathData['x-janis-allow-cors']) {
			const cors = this.buildCors(apiPath, allowedHttpMethods);
			this.handleBuiltCors(cors, apiPath);
		}

	}

	handleBuiltMethod(method, apiPath, httpMethod) {

		if(!method)
			return;

		this.appendToTemplate(method);
		createdMethods[this.getMethodName(apiPath, httpMethod)] = true;
	}

	handleBuiltCors(cors, apiPath) {

		if(!cors)
			return;

		this.appendToTemplate(cors);
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

	appendToTemplate(resource) {
		fs.appendFileSync(this.constructor.buildFilePath, resource);
	}

}

module.exports = IacApiBuilder;
