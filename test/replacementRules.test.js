import { describe, expect, it } from 'vitest';

import {
	serializeCustomVocabulary,
	serializeReplacementRules,
} from '../nodes/Speechall/helpers/replacementRules';

const node = {
	id: '1',
	name: 'Speechall',
	type: 'n8n-nodes-speechall.speechall',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('serializeCustomVocabulary', () => {
	it('removes empty terms', () => {
		expect(
			serializeCustomVocabulary({
				customVocabulary: {
					values: [{ term: 'Speechall' }, { term: ' ' }, { term: 'API' }],
				},
			}),
		).toEqual(['Speechall', 'API']);
	});
});

describe('serializeReplacementRules', () => {
	it('serializes exact, regex, and regex group rules', () => {
		expect(
			serializeReplacementRules(node, {
				replacementRules: {
					exactMatch: [{ search: 'foo', replacement: 'bar', caseSensitive: true }],
					regex: [{ pattern: '\\d+', replacement: '[number]', flags: ['i'] }],
					regexGroup: [
						{
							pattern: '(secret)',
							flags: ['m'],
							groupReplacements: {
								values: [{ groupNumber: 1, replacement: '[redacted]' }],
							},
						},
					],
				},
			}),
		).toEqual([
			{ kind: 'exact', search: 'foo', replacement: 'bar', caseSensitive: true },
			{ kind: 'regex', pattern: '\\d+', replacement: '[number]', flags: ['i'] },
			{
				kind: 'regex_group',
				pattern: '(secret)',
				groupReplacements: { 1: '[redacted]' },
				flags: ['m'],
			},
		]);
	});

	it('rejects duplicate regex group numbers', () => {
		expect(() =>
			serializeReplacementRules(node, {
				replacementRules: {
					regexGroup: [
						{
							pattern: '(secret)',
							groupReplacements: {
								values: [
									{ groupNumber: 1, replacement: 'a' },
									{ groupNumber: 1, replacement: 'b' },
								],
							},
						},
					],
				},
			}),
		).toThrow('Duplicate regex group replacement for group 1');
	});
});
