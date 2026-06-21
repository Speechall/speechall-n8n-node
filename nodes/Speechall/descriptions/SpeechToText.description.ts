import type { INodeProperties } from 'n8n-workflow';

import {
	advancedTranscriptionFields,
	binaryOutputFields,
	languageField,
	modelSelectionFields,
	replacementRulesField,
	transcriptOutputFormatField,
} from '../helpers/fields';

const speechToTextResource = {
	show: {
		resource: ['speechToText'],
	},
};

const transcribeFile = {
	show: {
		resource: ['speechToText'],
		operation: ['transcribeFile'],
	},
};

const transcribeRemoteUrl = {
	show: {
		resource: ['speechToText'],
		operation: ['transcribeRemoteUrl'],
	},
};

const listModels = {
	show: {
		resource: ['speechToText'],
		operation: ['listModels'],
	},
};

export const speechToTextProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Speech-to-Text',
				value: 'speechToText',
			},
		],
		default: 'speechToText',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: speechToTextResource,
		options: [
			{
				name: 'List Speech-to-Text Models',
				value: 'listModels',
				action: 'List speech to text models',
				description: 'List available Speechall speech-to-text models',
			},
			{
				name: 'Transcribe a File',
				value: 'transcribeFile',
				action: 'Transcribe a file',
				description: 'Transcribe audio from n8n binary data',
			},
			{
				name: 'Transcribe a Remote URL',
				value: 'transcribeRemoteUrl',
				action: 'Transcribe a remote URL',
				description: 'Transcribe audio from a public URL',
			},
		],
		default: 'transcribeFile',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Name of the binary property that contains the audio file',
		displayOptions: transcribeFile,
	},
	{
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/audio.mp3',
		description: 'Publicly accessible HTTP or HTTPS URL for the audio file',
		displayOptions: transcribeRemoteUrl,
	},
	...modelSelectionFields(transcribeFile),
	...modelSelectionFields(transcribeRemoteUrl),
	languageField(transcribeFile),
	languageField(transcribeRemoteUrl),
	transcriptOutputFormatField(transcribeFile),
	transcriptOutputFormatField(transcribeRemoteUrl),
	...advancedTranscriptionFields(transcribeFile),
	...advancedTranscriptionFields(transcribeRemoteUrl),
	replacementRulesField(transcribeRemoteUrl),
	{
		displayName: 'Include Source URL in Output',
		name: 'includeSourceUrl',
		type: 'boolean',
		default: false,
		description:
			'Whether to include the full remote URL in output. Signed URLs may contain secrets.',
		displayOptions: transcribeRemoteUrl,
	},
	...binaryOutputFields(transcribeFile),
	...binaryOutputFields(transcribeRemoteUrl),
	{
		displayName: 'Provider',
		name: 'provider',
		type: 'string',
		default: '',
		description: 'Only return models from this provider',
		displayOptions: listModels,
	},
	{
		displayName: 'Available Only',
		name: 'availableOnly',
		type: 'boolean',
		default: false,
		description: 'Whether to only return models currently marked available',
		displayOptions: listModels,
	},
	{
		displayName: 'Supports Diarization',
		name: 'supportsDiarization',
		type: 'boolean',
		default: false,
		displayOptions: listModels,
	},
	{
		displayName: 'Supports SRT',
		name: 'supportsSrt',
		type: 'boolean',
		default: false,
		displayOptions: listModels,
	},
	{
		displayName: 'Supports VTT',
		name: 'supportsVtt',
		type: 'boolean',
		default: false,
		displayOptions: listModels,
	},
	{
		displayName: 'Supports Streaming',
		name: 'supportsStreaming',
		type: 'boolean',
		default: false,
		description: 'Whether to only return models that support streaming metadata',
		displayOptions: listModels,
	},
];
