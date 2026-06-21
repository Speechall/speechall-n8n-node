import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { addTranscriptBinaryOutput, supportsTranscriptBinaryOutput } from '../helpers/binary';
import { getSelectedModel, normalizeModelsResponse } from '../helpers/models';
import { normalizeSpeechallTranscriptionResponse } from '../helpers/normalize';
import { serializeCustomVocabulary } from '../helpers/replacementRules';
import type { TranscriptOutputFormat } from '../helpers/types';
import {
	validateSpeakersExpected,
	validateTemperature,
	validateTimeout,
} from '../transport/errors';
import { speechallApiRequest } from '../transport/speechallApiRequest';

export async function transcribeFileOperation(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const parameters = getOperationParameters.call(this, itemIndex);
	const model = getSelectedModel(parameters);
	if (!model) {
		throw new NodeOperationError(this.getNode(), 'A Speechall model ID is required', { itemIndex });
	}

	validateTimeout(this, parameters.timeoutSeconds);
	validateTemperature(this, parameters.temperature);
	validateSpeakersExpected(this, parameters.speakersExpected);

	const binaryData = item.binary?.[parameters.binaryPropertyName];
	if (!binaryData) {
		throw new NodeOperationError(
			this.getNode(),
			`No binary data found in property "${parameters.binaryPropertyName}"`,
			{ itemIndex },
		);
	}

	if (parameters.modelSelectionMode === 'list') {
		await validateBinarySizeIfKnown.call(this, model, binaryData.fileSize, itemIndex);
	}

	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, parameters.binaryPropertyName);
	const qs = buildTranscriptionQuery(parameters, model);
	const response = await speechallApiRequest.call(this, 'POST', '/transcribe', {
		qs,
		body: buffer,
		timeoutMs: parameters.timeoutSeconds * 1000,
		headers: {
			'Content-Type': binaryData.mimeType || 'application/octet-stream',
		},
		encoding:
			parameters.outputFormat === 'json' || parameters.outputFormat === 'json_text'
				? 'json'
				: 'text',
		json: false,
	});

	const rawText = typeof response.rawBody === 'string' ? response.rawBody : undefined;
	const json = normalizeSpeechallTranscriptionResponse({
		response: response.body,
		rawText,
		outputFormat: parameters.outputFormat,
		model,
		language: parameters.language,
		source: 'binary',
	});

	let binary = item.binary;
	if (
		parameters.alsoReturnBinary &&
		supportsTranscriptBinaryOutput(parameters.outputFormat) &&
		typeof json.text === 'string'
	) {
		binary = await addTranscriptBinaryOutput.call(
			this,
			item,
			json.text,
			parameters.outputFormat,
			parameters.binaryOutputProperty,
		);
	}

	return {
		json,
		binary,
		pairedItem: { item: itemIndex },
	};
}

interface TranscribeFileParameters extends INodeParameters {
	binaryPropertyName: string;
	modelSelectionMode: string;
	model: string;
	modelId: string;
	language: string;
	outputFormat: TranscriptOutputFormat;
	punctuation: boolean;
	diarization: boolean;
	initialPrompt: string;
	temperature?: number;
	speakersExpected?: number;
	customVocabulary: INodeParameters;
	rulesetId: string;
	timeoutSeconds: number;
	alsoReturnBinary: boolean;
	binaryOutputProperty: string;
}

function getOperationParameters(
	this: IExecuteFunctions,
	itemIndex: number,
): TranscribeFileParameters {
	const temperature = optionalNumber(this.getNodeParameter('temperature', itemIndex, undefined));
	const speakersExpected = optionalNumber(
		this.getNodeParameter('speakersExpected', itemIndex, undefined),
	);

	return {
		binaryPropertyName: this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string,
		modelSelectionMode: this.getNodeParameter('modelSelectionMode', itemIndex, 'list') as string,
		model: this.getNodeParameter('model', itemIndex, '') as string,
		modelId: this.getNodeParameter('modelId', itemIndex, '') as string,
		language: this.getNodeParameter('language', itemIndex, 'en') as string,
		outputFormat: this.getNodeParameter(
			'outputFormat',
			itemIndex,
			'text',
		) as TranscriptOutputFormat,
		punctuation: this.getNodeParameter('punctuation', itemIndex, true) as boolean,
		diarization: this.getNodeParameter('diarization', itemIndex, false) as boolean,
		initialPrompt: this.getNodeParameter('initialPrompt', itemIndex, '') as string,
		temperature,
		speakersExpected,
		customVocabulary: this.getNodeParameter('customVocabulary', itemIndex, {}) as INodeParameters,
		rulesetId: this.getNodeParameter('rulesetId', itemIndex, '') as string,
		timeoutSeconds: this.getNodeParameter('timeoutSeconds', itemIndex, 300) as number,
		alsoReturnBinary: this.getNodeParameter('alsoReturnBinary', itemIndex, false) as boolean,
		binaryOutputProperty: this.getNodeParameter(
			'binaryOutputProperty',
			itemIndex,
			'transcript',
		) as string,
	};
}

function buildTranscriptionQuery(parameters: TranscribeFileParameters, model: string): IDataObject {
	const qs: IDataObject = {
		model,
		language: parameters.language,
		output_format: parameters.outputFormat,
		punctuation: parameters.punctuation,
		diarization: parameters.diarization,
	};

	addIfPresent(qs, 'initial_prompt', parameters.initialPrompt);
	addIfPresent(qs, 'temperature', parameters.temperature);
	addIfPresent(qs, 'speakers_expected', parameters.speakersExpected);
	addIfPresent(qs, 'ruleset_id', parameters.rulesetId);

	const customVocabulary = serializeCustomVocabulary(parameters);
	if (customVocabulary.length > 0) {
		qs.custom_vocabulary = customVocabulary;
	}

	return qs;
}

async function validateBinarySizeIfKnown(
	this: IExecuteFunctions,
	modelId: string,
	fileSize: string | number | undefined,
	itemIndex: number,
): Promise<void> {
	const bytes = parseFileSize(fileSize);
	if (bytes === undefined) {
		return;
	}

	const response = await speechallApiRequest.call(this, 'GET', '/speech-to-text-models', {
		timeoutMs: 30_000,
		json: true,
	});
	const model = normalizeModelsResponse(response.body).find(
		(candidate) => candidate.id === modelId,
	);
	const maxFileSizeBytes = model?.maxFileSizeBytes;
	if (typeof maxFileSizeBytes === 'number' && bytes > maxFileSizeBytes) {
		throw new NodeOperationError(
			this.getNode(),
			`Binary file is ${bytes} bytes, which exceeds the selected model limit of ${maxFileSizeBytes} bytes`,
			{ itemIndex },
		);
	}
}

function parseFileSize(fileSize: string | number | undefined): number | undefined {
	if (typeof fileSize === 'number') {
		return fileSize;
	}
	if (typeof fileSize !== 'string') {
		return undefined;
	}
	const normalized = fileSize.trim().toLowerCase();
	const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)\s*(b|kb|mb|gb)?$/);
	if (!match) {
		return undefined;
	}
	const value = Number(match[1]);
	const unit = match[2] ?? 'b';
	const multiplier =
		unit === 'gb' ? 1024 ** 3 : unit === 'mb' ? 1024 ** 2 : unit === 'kb' ? 1024 : 1;
	return Math.round(value * multiplier);
}

function optionalNumber(value: unknown): number | undefined {
	return value === '' || value === undefined || value === null ? undefined : Number(value);
}

function addIfPresent(qs: IDataObject, key: string, value: unknown): void {
	if (value !== '' && value !== undefined && value !== null) {
		qs[key] = value as IDataObject[string];
	}
}
