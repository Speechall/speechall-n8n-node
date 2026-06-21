import { describe, expect, it } from 'vitest';

import {
	filterModels,
	getSelectedModel,
	modelToOption,
	normalizeModel,
	normalizeModelsResponse,
} from '../nodes/Speechall/helpers/models';

describe('models helper', () => {
	it('selects manual or listed models', () => {
		expect(getSelectedModel({ modelSelectionMode: 'list', model: 'openai.whisper-1' })).toBe(
			'openai.whisper-1',
		);
		expect(getSelectedModel({ modelSelectionMode: 'manual', modelId: 'custom.model' })).toBe(
			'custom.model',
		);
	});

	it('normalizes model metadata defensively', () => {
		expect(
			normalizeModel({
				id: 'deepgram.nova-3',
				display_name: 'Deepgram Nova 3',
				is_available: true,
				supports_srt: true,
				supports_vtt: false,
				diarization: true,
				word_timestamps: true,
				max_file_size_bytes: 1000,
			}),
		).toMatchObject({
			id: 'deepgram.nova-3',
			displayName: 'Deepgram Nova 3',
			provider: 'deepgram',
			isAvailable: true,
			supportedFormats: ['text', 'json_text', 'json', 'srt'],
			supportsSrt: true,
			supportsVtt: false,
			diarization: true,
			wordTimestamps: true,
			maxFileSizeBytes: 1000,
		});
	});

	it('extracts model arrays from wrapper objects and filters models', () => {
		const models = normalizeModelsResponse({
			data: [
				{ id: 'openai.whisper-1', provider: 'openai', is_available: true },
				{ id: 'deepgram.nova-3', provider: 'deepgram', is_available: false },
			],
		});

		expect(filterModels(models, { provider: 'openai', availableOnly: true })).toHaveLength(1);
		expect(modelToOption(models[0])).toEqual({
			name: 'openai.whisper-1 - openai.whisper-1',
			value: 'openai.whisper-1',
			description: 'openai',
		});
	});
});
