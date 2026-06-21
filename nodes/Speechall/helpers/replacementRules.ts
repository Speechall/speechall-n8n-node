import type { IDataObject, INode, INodeParameters } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { RegexRuleFlag, ReplacementRule } from './types';

const ALLOWED_FLAGS: RegexRuleFlag[] = ['i', 'm', 's', 'u', 'x'];

export function serializeCustomVocabulary(parameters: INodeParameters): string[] {
	const collection = parameters.customVocabulary as IDataObject | undefined;
	if (!isObject(collection)) {
		return [];
	}

	const entries = collection.values;
	if (!Array.isArray(entries)) {
		return [];
	}

	return entries
		.map((entry) => (isObject(entry) && typeof entry.term === 'string' ? entry.term.trim() : ''))
		.filter((term) => term.length > 0);
}

export function serializeReplacementRules(
	node: INode,
	parameters: INodeParameters,
): ReplacementRule[] | undefined {
	const collection = parameters.replacementRules as IDataObject | undefined;
	if (!isObject(collection)) {
		return undefined;
	}

	const rules: ReplacementRule[] = [];

	for (const rule of getRuleRows(collection.exactMatch)) {
		const search = stringField(rule, 'search');
		const replacement = stringField(rule, 'replacement');
		if (!search || !replacement) {
			throw new NodeOperationError(
				node,
				'Exact replacement rules require search and replacement values',
			);
		}
		rules.push({
			kind: 'exact',
			search,
			replacement,
			caseSensitive: rule.caseSensitive === true,
		});
	}

	for (const rule of getRuleRows(collection.regex)) {
		const pattern = stringField(rule, 'pattern');
		const replacement = stringField(rule, 'replacement');
		if (!pattern || !replacement) {
			throw new NodeOperationError(
				node,
				'Regex replacement rules require pattern and replacement values',
			);
		}
		const flags = normalizeFlags(rule.flags);
		validateRegex(node, pattern, flags);
		rules.push({
			kind: 'regex',
			pattern,
			replacement,
			flags,
		});
	}

	for (const rule of getRuleRows(collection.regexGroup)) {
		const pattern = stringField(rule, 'pattern');
		if (!pattern) {
			throw new NodeOperationError(node, 'Regex group replacement rules require a pattern');
		}
		const flags = normalizeFlags(rule.flags);
		validateRegex(node, pattern, flags);
		const groupReplacements = serializeGroupReplacements(node, rule.groupReplacements);
		rules.push({
			kind: 'regex_group',
			pattern,
			groupReplacements,
			flags,
		});
	}

	return rules.length ? rules : undefined;
}

function serializeGroupReplacements(node: INode, value: unknown): Record<string, string> {
	const rows = isObject(value) ? getRuleRows(value.values) : [];
	const replacements: Record<string, string> = {};

	for (const row of rows) {
		const groupNumber = Number(row.groupNumber);
		const replacement = stringField(row, 'replacement');
		if (!Number.isInteger(groupNumber) || groupNumber <= 0) {
			throw new NodeOperationError(node, 'Regex group numbers must be positive integers');
		}
		if (!replacement) {
			throw new NodeOperationError(node, 'Regex group replacements require a replacement value');
		}
		if (replacements[String(groupNumber)] !== undefined) {
			throw new NodeOperationError(
				node,
				`Duplicate regex group replacement for group ${groupNumber}`,
			);
		}
		replacements[String(groupNumber)] = replacement;
	}

	if (Object.keys(replacements).length === 0) {
		throw new NodeOperationError(
			node,
			'Regex group replacement rules require at least one group replacement',
		);
	}

	return replacements;
}

function normalizeFlags(value: unknown): RegexRuleFlag[] {
	const flags = Array.isArray(value) ? value : [];
	const normalized: RegexRuleFlag[] = [];

	for (const flag of flags) {
		if (!isRegexRuleFlag(flag)) {
			throw new Error(`Unknown regex flag: ${String(flag)}`);
		}
		if (!normalized.includes(flag)) {
			normalized.push(flag);
		}
	}

	return normalized;
}

function validateRegex(node: INode, pattern: string, flags: RegexRuleFlag[]): void {
	if (flags.includes('x')) {
		return;
	}

	try {
		new RegExp(pattern, flags.join(''));
	} catch (error) {
		throw new NodeOperationError(node, `Invalid regex pattern: ${(error as Error).message}`);
	}
}

function getRuleRows(value: unknown): IDataObject[] {
	return Array.isArray(value) ? value.filter(isObject) : [];
}

function stringField(object: IDataObject, key: string): string {
	const value = object[key];
	return typeof value === 'string' ? value.trim() : '';
}

function isRegexRuleFlag(value: unknown): value is RegexRuleFlag {
	return typeof value === 'string' && ALLOWED_FLAGS.includes(value as RegexRuleFlag);
}

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
