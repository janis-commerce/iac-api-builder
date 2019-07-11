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

const failPath = {
	paths: {}
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

			// Try to find the file but can't find it.
			fsMock.expects('stat')
				.once()
				.withArgs(IacApiBuilder.schemasJSON)
				.rejects(new Error('File Not Found.'));

			// Don't Copy the source template, neither append nothing or try to read JSON file
			fsMock.expects('readFile').never();
			fsMock.expects('copyFile').never();
			fsMock.expects('appendFile').never();

			await assert.doesNotReject(builder.build());

			fsMock.verify();
		});
	});

	context('when API-Schemas file exist', () => {
		let builderMock;

		context('when file-system fails', () => {

			beforeEach(() => {
				sandbox.stub(console, 'log');
				sandbox.stub(console, 'error');

				fsMock = sandbox.mock(fs);
				builderMock = sandbox.mock(builder);
			});

			afterEach(() => {
				sandbox.restore();
			});

			it('should not init but can\'t copy', async () => {

				fsMock.expects('stat')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns();
				// G
				fsMock.expects('readFile')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns(JSON.stringify(failPath));

				// Calls to create the file but rejects
				fsMock.expects('copyFile')
					.once()
					.withArgs(IacApiBuilder.sourceFilePath, IacApiBuilder.buildFilePath)
					.rejects(new Error('Error can\'t copy file'));

				// Never calls Append
				fsMock.expects('appendFile').never();
				// Never try to build
				builderMock.expects('buildPath').never();

				await builder.build();

				fsMock.verify();
				builderMock.verify();
			});

			it('should init but fails to append', async () => {

				// Calls to create the file but rejects
				fsMock.expects('stat')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns();

				fsMock.expects('readFile')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns(JSON.stringify(fakePaths));

				fsMock.expects('copyFile')
					.once()
					.withArgs(IacApiBuilder.sourceFilePath, IacApiBuilder.buildFilePath)
					.returns();

				fsMock.expects('appendFile').atLeast(1)
					.rejects(new Error('Failed to Append'));

				await builder.build();

				fsMock.verify();
				// builderMock.verify();

			});
		});

		context('when file-system works', () => {
			beforeEach(() => {
				sandbox.stub(console, 'log');
				sandbox.stub(console, 'error');

				fsMock = sandbox.mock(fs);
				builderMock = sandbox.mock(builder);
			});

			afterEach(() => {
				sandbox.restore();
			});

			it('should not init if schema file is invalid json', async () => {

				fsMock.expects('stat')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns();

				fsMock.expects('readFile')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns();

				// Never try to Copy
				fsMock.expects('copyFile').never();

				// Never try to Append
				fsMock.expects('appendFile').never();
				// Never try to build
				builderMock.expects('buildPath').never();

				await builder.build();

				fsMock.verify();
				builderMock.verify();
			});

			it('should init but can\'t build because no paths', async () => {

				fsMock.expects('stat')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns();

				// Read a JSON without "paths"
				fsMock.expects('readFile')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns(JSON.stringify({}));

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

			it('should build', async () => {

				fsMock.expects('stat')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns();

				fsMock.expects('readFile')
					.once()
					.withArgs(IacApiBuilder.schemasJSON)
					.returns(JSON.stringify(fakePaths));

				fsMock.expects('copyFile')
					.once()
					.withArgs(IacApiBuilder.sourceFilePath, IacApiBuilder.buildFilePath)
					.returns();

				fsMock.expects('appendFile').atLeast(1)
					.returns();

				await builder.build();

				fsMock.verify();

			});
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
