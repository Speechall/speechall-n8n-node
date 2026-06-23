import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export const TRANSCRIPT_OUTPUT_FORMAT_OPTIONS = [
	{ name: 'Plain Text', value: 'text' },
	{ name: 'JSON Text', value: 'json_text' },
	{ name: 'Detailed JSON', value: 'json' },
	{ name: 'SRT Subtitles', value: 'srt' },
	{ name: 'WebVTT Subtitles', value: 'vtt' },
];

export function modelSelectionFields(displayOptions: IDisplayOptions): INodeProperties[] {
	return [
		{
			displayName: 'Model Selection',
			name: 'modelSelectionMode',
			type: 'options',
			options: [
				{ name: 'Choose From List', value: 'list' },
				{ name: 'Enter Model ID Manually', value: 'manual' },
			],
			default: 'list',
			displayOptions,
		},
		{
			displayName: 'Model Name or ID',
			name: 'model',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getSpeechToTextModels',
			},
			default: '',
			required: true,
			description:
				'Speechall speech-to-text model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			displayOptions: mergeDisplayOptions(displayOptions, {
				show: {
					modelSelectionMode: ['list'],
				},
			}),
		},
		{
			displayName: 'Model ID',
			name: 'modelId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'openai.whisper-1',
			description: 'Speechall model ID, for example openai.whisper-1',
			displayOptions: mergeDisplayOptions(displayOptions, {
				show: {
					modelSelectionMode: ['manual'],
				},
			}),
		},
	];
}

export function languageField(displayOptions: IDisplayOptions): INodeProperties {
	return {
		displayName: 'Language',
		name: 'language',
		type: 'options',
		default: 'en',
		description: 'Language code of the audio. Use auto for automatic detection when supported.',
		options: [
			{ name: 'Arabic', value: 'ar' },
			{ name: 'Auto Detect', value: 'auto' },
			{ name: 'Chinese', value: 'zh' },
			{ name: 'Dutch', value: 'nl' },
			{ name: 'English', value: 'en' },
			{ name: 'English (Australia)', value: 'en_au' },
			{ name: 'English (United Kingdom)', value: 'en_uk' },
			{ name: 'English (United States)', value: 'en_us' },
			{ name: 'French', value: 'fr' },
			{ name: 'German', value: 'de' },
			{ name: 'Italian', value: 'it' },
			{ name: 'Japanese', value: 'ja' },
			{ name: 'Korean', value: 'ko' },
			{ name: 'Portuguese', value: 'pt' },
			{ name: 'Spanish', value: 'es' },
			{ name: 'Turkish', value: 'tr' },
		],
		displayOptions,
	};
}

export function transcriptOutputFormatField(displayOptions: IDisplayOptions): INodeProperties {
	return {
		displayName: 'Output Format',
		name: 'outputFormat',
		type: 'options',
		default: 'text',
		description: 'Transcript output format. Use Detailed JSON for timestamps and speaker metadata.',
		options: TRANSCRIPT_OUTPUT_FORMAT_OPTIONS,
		displayOptions,
	};
}

export function advancedTranscriptionFields(displayOptions: IDisplayOptions): INodeProperties[] {
	return [
		{
			displayName: 'Punctuation',
			name: 'punctuation',
			type: 'boolean',
			default: true,
			description: 'Whether to enable automatic punctuation where supported',
			displayOptions,
		},
		{
			displayName: 'Diarization',
			name: 'diarization',
			type: 'boolean',
			default: false,
			description: 'Whether to identify and label different speakers where supported',
			displayOptions,
		},
		{
			displayName: 'Initial Prompt',
			name: 'initialPrompt',
			type: 'string',
			default: '',
			description: 'Context prompt for models that support prompting',
			displayOptions,
		},
		{
			displayName: 'Temperature',
			name: 'temperature',
			type: 'number',
			default: '',
			typeOptions: {
				minValue: 0,
				maxValue: 1,
				numberPrecision: 2,
			},
			description: 'Sampling temperature from 0 to 1',
			displayOptions,
		},
		{
			displayName: 'Speakers Expected',
			name: 'speakersExpected',
			type: 'number',
			default: '',
			typeOptions: {
				minValue: 1,
				maxValue: 10,
			},
			description: 'Optional speaker count hint for diarization',
			displayOptions: mergeDisplayOptions(displayOptions, {
				show: {
					diarization: [true],
				},
			}),
		},
		{
			displayName: 'Custom Vocabulary',
			name: 'customVocabulary',
			type: 'fixedCollection',
			default: {},
			placeholder: 'Add Term',
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					name: 'values',
					displayName: 'Term',
					values: [
						{
							displayName: 'Term',
							name: 'term',
							type: 'string',
							default: '',
							description: 'Word or phrase to improve recognition',
						},
					],
				},
			],
			displayOptions,
		},
		{
			displayName: 'Ruleset ID',
			name: 'rulesetId',
			type: 'string',
			default: '',
			description: 'UUID of a pre-defined Speechall replacement ruleset',
			displayOptions,
		},
		{
			displayName: 'Request Timeout (Seconds)',
			name: 'timeoutSeconds',
			type: 'number',
			default: 300,
			typeOptions: {
				minValue: 1,
				maxValue: 900,
			},
			description: 'HTTP request timeout. n8n execution timeouts may still end long workflows.',
			displayOptions,
		},
	];
}

export function binaryOutputFields(displayOptions: IDisplayOptions): INodeProperties[] {
	return [
		{
			displayName: 'Also Return as Binary File',
			name: 'alsoReturnBinary',
			type: 'boolean',
			default: false,
			description: 'Whether to attach text, SRT, or VTT output as binary data',
			displayOptions,
		},
		{
			displayName: 'Binary Output Property',
			name: 'binaryOutputProperty',
			type: 'string',
			default: 'transcript',
			required: true,
			displayOptions: mergeDisplayOptions(displayOptions, {
				show: {
					alsoReturnBinary: [true],
				},
			}),
		},
	];
}

export function replacementRulesField(displayOptions: IDisplayOptions): INodeProperties {
	return {
		displayName: 'Inline Replacement Rules',
		name: 'replacementRules',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Rule',
		description: 'Inline replacement rules to apply during remote URL transcription',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'exactMatch',
				displayName: 'Exact Match',
				values: [
					{ displayName: 'Search', name: 'search', type: 'string', default: '', required: true },
					{
						displayName: 'Replacement',
						name: 'replacement',
						type: 'string',
						default: '',
						required: true,
					},
					{
						displayName: 'Case Sensitive',
						name: 'caseSensitive',
						type: 'boolean',
						default: false,
					},
				],
			},
			{
				name: 'regex',
				displayName: 'Regex',
				values: [
					{ displayName: 'Pattern', name: 'pattern', type: 'string', default: '', required: true },
					{
						displayName: 'Replacement',
						name: 'replacement',
						type: 'string',
						default: '',
						required: true,
					},
					regexFlagsField(),
				],
			},
			{
				name: 'regexGroup',
				displayName: 'Regex Group',
				values: [
					{ displayName: 'Pattern', name: 'pattern', type: 'string', default: '', required: true },
					regexFlagsField(),
					{
						displayName: 'Group Replacements',
						name: 'groupReplacements',
						type: 'fixedCollection',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'values',
								displayName: 'Group',
								values: [
									{
										displayName: 'Group Number',
										name: 'groupNumber',
										type: 'number',
										default: 1,
									},
									{
										displayName: 'Replacement',
										name: 'replacement',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
		displayOptions,
	};
}

function regexFlagsField(): INodeProperties {
	return {
		displayName: 'Flags',
		name: 'flags',
		type: 'multiOptions',
		default: [],
		options: [
			{ name: 'Case Insensitive', value: 'i' },
			{ name: 'Dot Matches Newline', value: 's' },
			{ name: 'Extended', value: 'x' },
			{ name: 'Multiline', value: 'm' },
			{ name: 'Unicode', value: 'u' },
		],
	};
}

function mergeDisplayOptions(base: IDisplayOptions, additional: IDisplayOptions): IDisplayOptions {
	return {
		show: {
			...(base.show ?? {}),
			...(additional.show ?? {}),
		},
		hide: {
			...(base.hide ?? {}),
			...(additional.hide ?? {}),
		},
	};
}
