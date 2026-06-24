import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { addTranscriptBinaryOutput, supportsTranscriptBinaryOutput } from '../helpers/binary';
import { getSelectedModel } from '../helpers/models';
import { normalizeSpeechallTranscriptionResponse, sanitizeSourceUrl } from '../helpers/normalize';
import { serializeCustomVocabulary, serializeReplacementRules } from '../helpers/replacementRules';
import type { TranscriptOutputFormat } from '../helpers/types';
import {
	validateSpeakersExpected,
	validateTemperature,
	validateTimeout,
} from '../transport/errors';
import { speechallApiRequest } from '../transport/speechallApiRequest';

export async function transcribeRemoteUrlOperation(
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

	validateRemoteUrl(this, parameters.fileUrl, itemIndex);
	const body = buildRemoteBody(this, parameters, model);
	const response = await speechallApiRequest.call(this, 'POST', '/transcribe-remote', {
		body,
		timeoutMs: parameters.timeoutSeconds * 1000,
		headers: {
			'Content-Type': 'application/json',
		},
		encoding:
			parameters.outputFormat === 'json' || parameters.outputFormat === 'json_text'
				? 'json'
				: 'text',
		json: true,
	});

	const rawText = typeof response.rawBody === 'string' ? response.rawBody : undefined;
	const json = normalizeSpeechallTranscriptionResponse({
		response: response.body,
		rawText,
		outputFormat: parameters.outputFormat,
		model,
		language: parameters.language,
		source: 'remote_url',
		sourceUrlSanitized: sanitizeSourceUrl(parameters.fileUrl),
		fileUrl: parameters.includeSourceUrl ? parameters.fileUrl : undefined,
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

interface TranscribeRemoteUrlParameters extends INodeParameters {
	fileUrl: string;
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
	replacementRules: INodeParameters;
	includeSourceUrl: boolean;
	timeoutSeconds: number;
	alsoReturnBinary: boolean;
	binaryOutputProperty: string;
}

function getOperationParameters(
	this: IExecuteFunctions,
	itemIndex: number,
): TranscribeRemoteUrlParameters {
	const temperature = optionalNumber(this.getNodeParameter('temperature', itemIndex, undefined));
	const diarization = this.getNodeParameter('diarization', itemIndex, false) as boolean;
	const speakersExpected = diarization
		? optionalNumber(this.getNodeParameter('speakersExpected', itemIndex, undefined))
		: undefined;

	return {
		fileUrl: this.getNodeParameter('fileUrl', itemIndex, '') as string,
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
		diarization,
		initialPrompt: this.getNodeParameter('initialPrompt', itemIndex, '') as string,
		temperature,
		speakersExpected,
		customVocabulary: this.getNodeParameter('customVocabulary', itemIndex, {}) as INodeParameters,
		rulesetId: this.getNodeParameter('rulesetId', itemIndex, '') as string,
		replacementRules: this.getNodeParameter('replacementRules', itemIndex, {}) as INodeParameters,
		includeSourceUrl: this.getNodeParameter('includeSourceUrl', itemIndex, false) as boolean,
		timeoutSeconds: this.getNodeParameter('timeoutSeconds', itemIndex, 300) as number,
		alsoReturnBinary: this.getNodeParameter('alsoReturnBinary', itemIndex, false) as boolean,
		binaryOutputProperty: this.getNodeParameter(
			'binaryOutputProperty',
			itemIndex,
			'transcript',
		) as string,
	};
}

function buildRemoteBody(
	context: IExecuteFunctions,
	parameters: TranscribeRemoteUrlParameters,
	model: string,
): IDataObject {
	const body: IDataObject = {
		file_url: parameters.fileUrl,
		model,
		language: parameters.language,
		output_format: parameters.outputFormat,
		punctuation: parameters.punctuation,
		diarization: parameters.diarization,
	};

	addIfPresent(body, 'initial_prompt', parameters.initialPrompt);
	addIfPresent(body, 'temperature', parameters.temperature);
	if (parameters.diarization) {
		addIfPresent(body, 'speakers_expected', parameters.speakersExpected);
	}
	addIfPresent(body, 'ruleset_id', parameters.rulesetId);

	const customVocabulary = serializeCustomVocabulary(parameters);
	if (customVocabulary.length > 0) {
		body.custom_vocabulary = customVocabulary;
	}

	const replacementRules = serializeReplacementRules(context.getNode(), parameters);
	if (replacementRules) {
		body.replacement_ruleset = replacementRules;
	}

	return body;
}

function validateRemoteUrl(context: IExecuteFunctions, fileUrl: string, itemIndex: number): void {
	if (!fileUrl.trim()) {
		throw new NodeOperationError(context.getNode(), 'File URL is required', { itemIndex });
	}

	try {
		const url = new URL(fileUrl);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error('Unsupported protocol');
		}
	} catch {
		throw new NodeOperationError(context.getNode(), 'File URL must be a valid HTTP or HTTPS URL', {
			itemIndex,
		});
	}
}

function optionalNumber(value: unknown): number | undefined {
	return value === '' || value === undefined || value === null ? undefined : Number(value);
}

function addIfPresent(body: IDataObject, key: string, value: unknown): void {
	if (value !== '' && value !== undefined && value !== null) {
		body[key] = value as IDataObject[string];
	}
}
