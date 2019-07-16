#!/usr/bin/env node

'use strict';

const { IacApiBuilder } = require('./lib');

(async () => {
	const iacApiBuilder = new IacApiBuilder();
	await iacApiBuilder.build();
})();
