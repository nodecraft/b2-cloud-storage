import base from '@nodecraft/eslint-config/base';
import json from '@nodecraft/eslint-config/json';
import globals from 'globals';

// Base JS rules have no files filter, so keep them off JSON files.
const jsonIgnore = ['**/*.json'];

export default [
	{
		ignores: ['build/', 'coverage/', 'store/', '.nyc_output/'],
	},
	...base.map((config) => {
		return { ...config, ignores: jsonIgnore };
	}),
	...json,
	{
		files: ['**/*.mjs'],
		languageOptions: {
			sourceType: 'module',
		},
	},
	{
		files: ['test/**/*.js'],
		languageOptions: {
			globals: globals.mocha,
		},
	},
];
