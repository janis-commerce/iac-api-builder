'use strict';

const assert = require('assert');
const sandbox = require('sinon').createSandbox();

const fs = require('fs');

const { IacApiBuilder } = require('./../lib');

const fakePaths = {
	paths: {
		'local/': {
			get: {
				responses: {
					200: {
						description: 'Ok'
					},
					400: {
						description: 'Invalid data'
					}
				}
			}
		},
		'local/id': {
			'x-janis-allow-cors': true,
			get: {
				security: [true],
				parameters: [{
					in: 'path',
					name: 'id',
					description: 'Request id'
				}],
				responses: {
					200: {
						description: '12'
					},
					400: {
						description: 'Invalid data'
					},
					404: {
						description: 'Not Found'
					}
				}
			},
			post: {
				parameters: [{
					in: 'body',
					name: 'payload',
					description: 'Request payload',
					schema: {
						$ref: '#/definitions/payload'
					}
				}],
				responses: {
					200: {
						description: 'Ok'
					},
					400: {
						description: 'Invalid data'
					}
				}
			},
			put: {
				responses: {
					200: {
						description: 'Ok'
					},
					400: {
						description: 'Invalid data'
					}
				}
			},
			patch: {
				responses: {
					200: {
						description: 'Ok'
					},
					400: {
						description: 'Invalid data'
					}
				}
			},
			delete: {
				responses: {
					200: {
						description: 'Ok'
					},
					400: {
						description: 'Invalid data'
					}
				}
			}
		}
	}
};

describe('IacApiBuilder', () => {

	const builder = new IacApiBuilder();
	let fsMock;

	context('when API-Schemas file doesn\'t exist', () => {

		before(() => {
			sandbox.stub(console, 'log');
			sandbox.stub(console, 'error');

			fsMock = sandbox.mock(fs);
		});

		after(() => {
			sandbox.restore();
		});

		it('should not build but not rejects', async () => {

			// Don't Copy the source template, neither append nothing
			fsMock.expects('copyFile').never();
			fsMock.expects('appendFile').never();

			await assert.doesNotReject(builder.build());
		});
	});

	context('when API-Schemas file exist', () => {
		let builderMock;

		beforeEach(() => {
			/* sandbox.stub(console, 'log');
			sandbox.stub(console, 'error'); */

			fsMock = sandbox.mock(fs);
			builderMock = sandbox.mock(builder);
		});

		afterEach(() => {
			sandbox.restore();
		});

		it('should not init if file-system can not do it', async () => {

			builderMock.expects('getSchemasJSON')
				.once()
				.returns({
					paths: {}
				});

			fsMock.expects('stat')
				.once()
				.withArgs(IacApiBuilder.schemasJSON)
				.returns();

			// Calls to create the file but rejects
			fsMock.expects('copyFile')
				.once()
				.withArgs(IacApiBuilder.sourceFilePath, IacApiBuilder.buildFilePath)
				.rejects(new Error('Bad Write Permissions'));

			// Never calls Append
			fsMock.expects('appendFile').never();
			// Never try to build
			builderMock.expects('buildPath').never();

			await builder.build();

			fsMock.verify();
			builderMock.verify();
		});

		it('should init but can\'t build because no paths', async () => {

			builderMock.expects('getSchemasJSON')
				.once()
				.returns({
					paths: {}
				});

			// Calls to create the file but rejects
			fsMock.expects('stat')
				.once()
				.withArgs(IacApiBuilder.schemasJSON)
				.returns();

			fsMock.expects('copyFile')
				.once()
				.withArgs(IacApiBuilder.sourceFilePath, IacApiBuilder.buildFilePath)
				.returns();

			// Never calls Append
			fsMock.expects('appendFile').never();
			// Never try to build
			builderMock.expects('buildPath').never();

			await builder.build();

			fsMock.verify();
			builderMock.verify();

		});

		it('should init but can\'t build File-system failed to append', async () => {

			builderMock.expects('getSchemasJSON')
				.once()
				.returns(fakePaths);

			// Calls to create the file but rejects
			fsMock.expects('stat')
				.once()
				.withArgs(IacApiBuilder.schemasJSON)
				.returns();

			fsMock.expects('copyFile')
				.once()
				.withArgs(IacApiBuilder.sourceFilePath, IacApiBuilder.buildFilePath)
				.returns();

			fsMock.expects('appendFile').atLeast(1)
				.rejects(new Error('Failed to Append'));

			await builder.build();

			fsMock.verify();
			builderMock.verify();

		});

		it('should build', async () => {

			builderMock.expects('getSchemasJSON')
				.once()
				.returns(fakePaths);

			// Calls to create the file but rejects
			fsMock.expects('stat')
				.once()
				.withArgs(IacApiBuilder.schemasJSON)
				.returns();

			fsMock.expects('copyFile')
				.once()
				.withArgs(IacApiBuilder.sourceFilePath, IacApiBuilder.buildFilePath)
				.returns();

			fsMock.expects('appendFile').atLeast(1)
				.returns();

			await builder.build();

			fsMock.verify();
			builderMock.verify();

		});
	});

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
