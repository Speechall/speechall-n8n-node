import { describe, expect, it } from 'vitest';

import {
	normalizeSpeechallTranscriptionResponse,
	sanitizeSourceUrl,
} from '../nodes/Speechall/helpers/normalize';

describe('normalizeSpeechallTranscriptionResponse', () => {
	it('normalizes text-like responses', () => {
		expect(
			normalizeSpeechallTranscriptionResponse({
				response: 'hello world',
				outputFormat: 'text',
				model: 'openai.whisper-1',
				language: 'en',
				source: 'binary',
			}),
		).toEqual({
			text: 'hello world',
			outputFormat: 'text',
			model: 'openai.whisper-1',
			language: 'en',
			source: 'binary',
		});
	});

	it('preserves detailed JSON fields and adds metadata', () => {
		expect(
			normalizeSpeechallTranscriptionResponse({
				response: {
					id: 'transcript_123',
					text: 'hello',
					segments: [{ text: 'hello', speaker: 'A' }],
					provider_metadata: { confidence: 0.9 },
				},
				outputFormat: 'json',
				model: 'deepgram.nova-3',
				source: 'binary',
			}),
		).toEqual({
			id: 'transcript_123',
			text: 'hello',
			segments: [{ text: 'hello', speaker: 'A' }],
			provider_metadata: { confidence: 0.9 },
			outputFormat: 'json',
			model: 'deepgram.nova-3',
			source: 'binary',
		});
	});

	it('moves node metadata when API fields would be overwritten', () => {
		expect(
			normalizeSpeechallTranscriptionResponse({
				response: {
					text: 'hello',
					model: 'api-model-field',
				},
				outputFormat: 'json_text',
				model: 'openai.whisper-1',
				source: 'remote_url',
				sourceUrlSanitized: 'https://example.com/audio.mp3',
			}),
		).toEqual({
			text: 'hello',
			model: 'api-model-field',
			_speechall: {
				outputFormat: 'json_text',
				model: 'openai.whisper-1',
				source: 'remote_url',
				sourceUrlSanitized: 'https://example.com/audio.mp3',
			},
		});
	});
});

describe('sanitizeSourceUrl', () => {
	it('removes query strings and fragments', () => {
		expect(sanitizeSourceUrl('https://example.com/path/audio.mp3?token=secret#part')).toBe(
			'https://example.com/path/audio.mp3',
		);
	});
});
