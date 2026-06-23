import { describe, expect, it, vi } from 'vitest';

import { Speechall } from '../nodes/Speechall/Speechall.node';
import { transcribeFileOperation } from '../nodes/Speechall/operations/transcribeFile.operation';
import { transcribeRemoteUrlOperation } from '../nodes/Speechall/operations/transcribeRemoteUrl.operation';
import { getSpeechToTextModels } from '../nodes/Speechall/loadOptions/getSpeechToTextModels';

const node = {
	id: 'speechall-node',
	name: 'Speechall',
	type: 'n8n-nodes-speechall.speechall',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function createExecuteContext({
	parameters = {},
	items = [],
	responses = [],
	continueOnFail = false,
} = {}) {
	const httpRequestWithAuthentication = vi.fn(async () => {
		const next = responses.shift();
		if (next instanceof Error) {
			throw next;
		}
		return next;
	});

	return {
		getNode: () => node,
		continueOnFail: () => continueOnFail,
		getInputData: (index) => {
			if (typeof index === 'number') {
				return [items[index]];
			}
			return items;
		},
		getNodeParameter: (name, _itemIndex, fallback) =>
			Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback,
		helpers: {
			httpRequestWithAuthentication,
			getBinaryDataBuffer: vi.fn(async () => Buffer.from('audio bytes')),
			prepareBinaryData: vi.fn(async (buffer, fileName, mimeType) => ({
				data: buffer.toString('base64'),
				fileName,
				mimeType,
			})),
		},
	};
}

describe('transcribeFileOperation', () => {
	it('builds a raw binary transcription request and adds optional binary output', async () => {
		const item = {
			json: { input: true },
			binary: {
				data: {
					mimeType: 'audio/mpeg',
					fileSize: '10 b',
					fileName: 'meeting.mp3',
					data: 'abc',
				},
			},
		};
		const context = createExecuteContext({
			items: [item],
			parameters: {
				binaryPropertyName: 'data',
				modelSelectionMode: 'manual',
				modelId: 'openai.whisper-1',
				language: 'en',
				outputFormat: 'srt',
				punctuation: true,
				diarization: false,
				speakersExpected: 1,
				customVocabulary: {
					values: [{ term: 'Speechall' }, { term: '' }, { term: 'API' }],
				},
				rulesetId: 'ruleset-123',
				timeoutSeconds: 120,
				alsoReturnBinary: true,
				binaryOutputProperty: 'transcript',
			},
			responses: [
				{
					statusCode: 200,
					headers: { 'content-type': 'text/plain' },
					body: '1\n00:00:00,000 --> 00:00:01,000\nHello',
				},
			],
		});

		const result = await transcribeFileOperation.call(context, item, 0);
		const request = context.helpers.httpRequestWithAuthentication.mock.calls[0][1];

		expect(context.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
		expect(request).toMatchObject({
			baseURL: 'https://api.speechall.com/v1',
			url: '/transcribe',
			method: 'POST',
			arrayFormat: 'repeat',
			timeout: 120000,
			headers: {
				'Content-Type': 'audio/mpeg',
				'X-Speechall-Client': 'n8n-nodes-speechall',
			},
			qs: {
				model: 'openai.whisper-1',
				language: 'en',
				output_format: 'srt',
				punctuation: true,
				diarization: false,
				ruleset_id: 'ruleset-123',
				custom_vocabulary: ['Speechall', 'API'],
			},
		});
		expect(request.qs).not.toHaveProperty('speakers_expected');
		expect(Buffer.isBuffer(request.body)).toBe(true);
		expect(result.json).toEqual({
			text: '1\n00:00:00,000 --> 00:00:01,000\nHello',
			outputFormat: 'srt',
			model: 'openai.whisper-1',
			language: 'en',
			source: 'binary',
		});
		expect(result.binary.transcript).toMatchObject({
			fileName: 'speechall-transcript.srt',
			mimeType: 'application/x-subrip',
		});
		expect(result.binary.data).toBe(item.binary.data);
		expect(result.pairedItem).toEqual({ item: 0 });
	});

	it('fails locally when listed model file size metadata is exceeded', async () => {
		const item = {
			json: {},
			binary: {
				data: {
					mimeType: 'audio/wav',
					fileSize: '2 kb',
					data: 'abc',
				},
			},
		};
		const context = createExecuteContext({
			items: [item],
			parameters: {
				binaryPropertyName: 'data',
				modelSelectionMode: 'list',
				model: 'deepgram.nova-3',
				language: 'en',
				outputFormat: 'text',
				timeoutSeconds: 300,
			},
			responses: [
				{
					statusCode: 200,
					headers: { 'content-type': 'application/json' },
					body: {
						data: [{ id: 'deepgram.nova-3', max_file_size_bytes: 100 }],
					},
				},
			],
		});

		await expect(transcribeFileOperation.call(context, item, 0)).rejects.toThrow(
			'exceeds the selected model limit',
		);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('transcribeRemoteUrlOperation', () => {
	it('builds a remote URL request, serializes inline rules, and redacts source URL by default', async () => {
		const item = { json: { input: true }, binary: { existing: { data: 'abc' } } };
		const context = createExecuteContext({
			items: [item],
			parameters: {
				fileUrl: 'https://cdn.example.com/audio.mp3?signature=secret#fragment',
				modelSelectionMode: 'manual',
				modelId: 'deepgram.nova-3',
				language: 'auto',
				outputFormat: 'json',
				punctuation: true,
				diarization: true,
				initialPrompt: 'Meeting about Speechall',
				temperature: 0.2,
				speakersExpected: 2,
				customVocabulary: { values: [{ term: 'Speechall' }] },
				rulesetId: 'ruleset-123',
				replacementRules: {
					exactMatch: [{ search: 'foo', replacement: 'bar', caseSensitive: false }],
					regexGroup: [
						{
							pattern: '(secret)',
							groupReplacements: {
								values: [{ groupNumber: 1, replacement: '[redacted]' }],
							},
						},
					],
				},
				includeSourceUrl: false,
				timeoutSeconds: 300,
			},
			responses: [
				{
					statusCode: 200,
					headers: { 'content-type': 'application/json' },
					body: {
						id: 'transcript-1',
						text: 'hello',
						segments: [],
					},
				},
			],
		});

		const result = await transcribeRemoteUrlOperation.call(context, item, 0);
		const request = context.helpers.httpRequestWithAuthentication.mock.calls[0][1];

		expect(request).toMatchObject({
			baseURL: 'https://api.speechall.com/v1',
			url: '/transcribe-remote',
			method: 'POST',
			json: true,
			body: {
				file_url: 'https://cdn.example.com/audio.mp3?signature=secret#fragment',
				model: 'deepgram.nova-3',
				language: 'auto',
				output_format: 'json',
				punctuation: true,
				diarization: true,
				initial_prompt: 'Meeting about Speechall',
				temperature: 0.2,
				speakers_expected: 2,
				ruleset_id: 'ruleset-123',
				custom_vocabulary: ['Speechall'],
				replacement_ruleset: [
					{ kind: 'exact', search: 'foo', replacement: 'bar', caseSensitive: false },
					{
						kind: 'regex_group',
						pattern: '(secret)',
						groupReplacements: { 1: '[redacted]' },
						flags: [],
					},
				],
			},
		});
		expect(result.json).toEqual({
			id: 'transcript-1',
			text: 'hello',
			segments: [],
			outputFormat: 'json',
			model: 'deepgram.nova-3',
			language: 'auto',
			source: 'remote_url',
			sourceUrlSanitized: 'https://cdn.example.com/audio.mp3',
		});
		expect(result.json.fileUrl).toBeUndefined();
		expect(result.binary).toBe(item.binary);
	});

	it('does not send speakers_expected when diarization is disabled', async () => {
		const item = { json: { input: true } };
		const context = createExecuteContext({
			items: [item],
			parameters: {
				fileUrl: 'https://cdn.example.com/audio.mp3',
				modelSelectionMode: 'manual',
				modelId: 'assemblyai.universal-2',
				language: 'en',
				outputFormat: 'text',
				punctuation: true,
				diarization: false,
				temperature: 0,
				speakersExpected: 1,
				timeoutSeconds: 300,
			},
			responses: [
				{
					statusCode: 200,
					headers: { 'content-type': 'text/plain' },
					body: 'hello',
				},
			],
		});

		await transcribeRemoteUrlOperation.call(context, item, 0);
		const request = context.helpers.httpRequestWithAuthentication.mock.calls[0][1];

		expect(request.body).toMatchObject({
			file_url: 'https://cdn.example.com/audio.mp3',
			model: 'assemblyai.universal-2',
			diarization: false,
		});
		expect(request.body).not.toHaveProperty('speakers_expected');
	});
});

describe('Speechall node execution', () => {
	it('returns item-level errors when continueOnFail is enabled', async () => {
		const context = createExecuteContext({
			continueOnFail: true,
			items: [{ json: { input: true } }],
			parameters: {
				operation: 'transcribeFile',
				binaryPropertyName: 'data',
				modelSelectionMode: 'manual',
				modelId: 'openai.whisper-1',
			},
		});
		const nodeType = new Speechall();

		await expect(nodeType.execute.call(context)).resolves.toEqual([
			[
				{
					json: {
						error: 'No binary data found in property "data"',
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});
});

describe('getSpeechToTextModels', () => {
	it('loads dynamic model options from Speechall model metadata', async () => {
		const context = createExecuteContext({
			responses: [
				{
					statusCode: 200,
					headers: { 'content-type': 'application/json' },
					body: {
						data: [
							{
								id: 'openai.whisper-1',
								display_name: 'OpenAI Whisper',
								provider: 'openai',
							},
						],
					},
				},
			],
		});

		await expect(getSpeechToTextModels.call(context)).resolves.toEqual([
			{
				name: 'OpenAI Whisper - openai.whisper-1',
				value: 'openai.whisper-1',
				description: 'openai',
			},
		]);
	});
});
