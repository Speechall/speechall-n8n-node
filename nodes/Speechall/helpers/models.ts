import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

import type { NormalizedModel, SpeechallModel, TranscriptOutputFormat } from './types';

const DEFAULT_FORMATS: TranscriptOutputFormat[] = ['text', 'json_text', 'json'];

export function getSelectedModel(parameters: {
	modelSelectionMode: string;
	model?: string;
	modelId?: string;
}): string {
	const selectionMode = parameters.modelSelectionMode;
	const value = selectionMode === 'manual' ? parameters.modelId : parameters.model;
	return typeof value === 'string' ? value.trim() : '';
}

export function getModelIdentifier(model: SpeechallModel): string {
	const value = model.id ?? model.model ?? model.identifier;
	return typeof value === 'string' ? value.trim() : '';
}

export function normalizeModel(model: SpeechallModel): NormalizedModel | undefined {
	const id = getModelIdentifier(model);

	if (!id) {
		return undefined;
	}

	const supportedFormats = new Set<TranscriptOutputFormat>(DEFAULT_FORMATS);
	const explicitFormats = Array.isArray(model.supported_formats) ? model.supported_formats : [];
	for (const format of explicitFormats) {
		if (isTranscriptOutputFormat(format)) {
			supportedFormats.add(format);
		}
	}

	if (model.supports_srt === true) {
		supportedFormats.add('srt');
	}
	if (model.supports_vtt === true) {
		supportedFormats.add('vtt');
	}

	const displayName =
		stringOrUndefined(model.display_name) ??
		stringOrUndefined(model.displayName) ??
		stringOrUndefined(model.description) ??
		id;

	return {
		id,
		displayName,
		provider: stringOrUndefined(model.provider) ?? inferProviderFromModelId(id),
		isAvailable: typeof model.is_available === 'boolean' ? model.is_available : undefined,
		supportedLanguages: Array.isArray(model.supported_languages)
			? model.supported_languages
			: undefined,
		supportedFormats: [...supportedFormats],
		supportsSrt: supportedFormats.has('srt'),
		supportsVtt: supportedFormats.has('vtt'),
		diarization: booleanOrNull(model.diarization),
		punctuation: booleanOrNull(model.punctuation),
		wordTimestamps: booleanOrNull(model.word_timestamps),
		costPerSecondUsd: numberOrNull(model.cost_per_second_usd),
		maxFileSizeBytes: numberOrNull(model.max_file_size_bytes),
		maxDurationSeconds: numberOrNull(model.max_duration_seconds),
		raw: model,
	};
}

export function normalizeModelsResponse(response: unknown): NormalizedModel[] {
	const models = extractModelArray(response);
	return models
		.map((model) => normalizeModel(model))
		.filter((model): model is NormalizedModel => model !== undefined);
}

export function malformedModelsFromResponse(response: unknown): IDataObject[] {
	return extractModelArray(response)
		.filter((model) => !getModelIdentifier(model))
		.map((model) => ({ raw: model, malformed: true }));
}

export function modelToOption(model: NormalizedModel): INodePropertyOptions {
	return {
		name: `${model.displayName} - ${model.id}`,
		value: model.id,
		description: model.provider,
	};
}

export function filterModels(models: NormalizedModel[], filters: IDataObject): NormalizedModel[] {
	const provider = stringOrUndefined(filters.provider)?.toLowerCase();
	const availableOnly = filters.availableOnly === true;
	const supportsDiarization = filters.supportsDiarization === true;
	const supportsSrt = filters.supportsSrt === true;
	const supportsVtt = filters.supportsVtt === true;
	const supportsStreaming = filters.supportsStreaming === true;

	return models.filter((model) => {
		if (provider && model.provider?.toLowerCase() !== provider) {
			return false;
		}
		if (availableOnly && model.isAvailable !== true) {
			return false;
		}
		if (supportsDiarization && model.diarization !== true) {
			return false;
		}
		if (supportsSrt && model.supportsSrt !== true) {
			return false;
		}
		if (supportsVtt && model.supportsVtt !== true) {
			return false;
		}
		if (supportsStreaming && model.raw.streamable !== true) {
			return false;
		}
		return true;
	});
}

function extractModelArray(response: unknown): SpeechallModel[] {
	if (Array.isArray(response)) {
		return response.filter(isObject) as SpeechallModel[];
	}

	if (!isObject(response)) {
		return [];
	}

	for (const key of ['models', 'data', 'items', 'results']) {
		const value = response[key];
		if (Array.isArray(value)) {
			return value.filter(isObject) as SpeechallModel[];
		}
	}

	return [];
}

function isTranscriptOutputFormat(value: unknown): value is TranscriptOutputFormat {
	return (
		value === 'text' ||
		value === 'json_text' ||
		value === 'json' ||
		value === 'srt' ||
		value === 'vtt'
	);
}

function inferProviderFromModelId(id: string): string | undefined {
	const [provider] = id.split('.');
	return provider || undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberOrNull(value: unknown): number | null | undefined {
	return typeof value === 'number' ? value : value === null ? null : undefined;
}

function booleanOrNull(value: unknown): boolean | null | undefined {
	return typeof value === 'boolean' ? value : value === null ? null : undefined;
}

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
