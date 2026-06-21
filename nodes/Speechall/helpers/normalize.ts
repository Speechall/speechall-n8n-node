import type { IDataObject } from 'n8n-workflow';

import type { NormalizedTranscriptionItem, SpeechallSource, TranscriptOutputFormat } from './types';

export interface NormalizeTranscriptionInput {
	response: unknown;
	rawText?: string;
	outputFormat: TranscriptOutputFormat;
	model: string;
	language?: string;
	source: SpeechallSource;
	sourceUrlSanitized?: string;
	fileUrl?: string;
}

export function normalizeSpeechallTranscriptionResponse(
	input: NormalizeTranscriptionInput,
): NormalizedTranscriptionItem {
	const parsedResponse = parseResponse(input.response, input.rawText, input.outputFormat);
	const metadata = buildMetadata(input);

	if (
		input.outputFormat === 'text' ||
		input.outputFormat === 'srt' ||
		input.outputFormat === 'vtt'
	) {
		return {
			text: stringifyTextResponse(parsedResponse, input.rawText),
			...metadata,
		};
	}

	if (isObject(parsedResponse)) {
		return mergeMetadata(parsedResponse, metadata);
	}

	return {
		text: stringifyTextResponse(parsedResponse, input.rawText),
		...metadata,
	};
}

export function sanitizeSourceUrl(fileUrl: string): string {
	const url = new URL(fileUrl);
	url.search = '';
	url.hash = '';
	return url.toString();
}

export function parseSpeechallBody(body: unknown, contentType: string | undefined): unknown {
	if (typeof body !== 'string') {
		return body;
	}

	const trimmed = body.trim();
	if (!trimmed) {
		return '';
	}

	if (contentType?.toLowerCase().includes('application/json')) {
		return JSON.parse(trimmed);
	}

	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			return JSON.parse(trimmed);
		} catch {
			return body;
		}
	}

	return body;
}

function buildMetadata(input: NormalizeTranscriptionInput): NormalizedTranscriptionItem {
	const metadata: NormalizedTranscriptionItem = {
		outputFormat: input.outputFormat,
		model: input.model,
		source: input.source,
	};

	if (input.language) {
		metadata.language = input.language;
	}
	if (input.sourceUrlSanitized) {
		metadata.sourceUrlSanitized = input.sourceUrlSanitized;
	}
	if (input.fileUrl) {
		metadata.fileUrl = input.fileUrl;
	}

	return metadata;
}

function parseResponse(
	response: unknown,
	rawText: string | undefined,
	outputFormat: TranscriptOutputFormat,
): unknown {
	if (outputFormat === 'text' || outputFormat === 'srt' || outputFormat === 'vtt') {
		return rawText ?? response;
	}
	return response;
}

function stringifyTextResponse(response: unknown, rawText: string | undefined): string {
	if (rawText !== undefined) {
		return rawText;
	}
	if (typeof response === 'string') {
		return response;
	}
	if (Buffer.isBuffer(response)) {
		return response.toString('utf8');
	}
	if (response === null || response === undefined) {
		return '';
	}
	if (isObject(response) && typeof response.text === 'string') {
		return response.text;
	}
	return JSON.stringify(response);
}

function mergeMetadata(
	response: IDataObject,
	metadata: NormalizedTranscriptionItem,
): NormalizedTranscriptionItem {
	const collisions = Object.keys(metadata).filter((key) => response[key] !== undefined);

	if (collisions.length === 0) {
		return {
			...response,
			...metadata,
		} as NormalizedTranscriptionItem;
	}

	return {
		...response,
		_speechall: metadata,
	} as unknown as NormalizedTranscriptionItem;
}

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
