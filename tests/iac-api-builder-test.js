'use strict';

const assert = require('assert');

const sandbox = require('sinon').createSandbox();
const { IacApiBuilder, IacApiBuilderError } = require('./../lib');

describe('IacApiBuilder', () => {

	assert(IacApiBuilderError);

});

describe('index', () => {

	before(() => {
		sandbox.stub(IacApiBuilder.prototype, 'build');
	});

	after(() => {
		sandbox.restore();
	});

	it('should run the index script without problems', () => {
		const index = require('./../index'); // eslint-disable-line
	});

});
