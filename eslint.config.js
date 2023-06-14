/** @type {import('@types/eslint').Linter.BaseConfig} */
export default {
	files: ['src/**/*.(js|ts)'],
	parser: '@typescript-eslint',
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict', 'prettier', 'plugin:prettier/recommended'],
	plugins: ['@typescript-eslint', 'prettier'],
	rules: {
		'no-console': 'error',
	},
};
