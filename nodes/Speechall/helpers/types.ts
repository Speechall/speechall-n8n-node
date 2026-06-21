import type { IDataObject } from 'n8n-workflow';

export const SPEECHALL_API_BASE_URL = 'https://api.speechall.com/v1';

export type TranscriptOutputFormat = 'text' | 'json_text' | 'json' | 'srt' | 'vtt';

export type SpeechallSource = 'binary' | 'remote_url';

export type RegexRuleFlag = 'i' | 'm' | 's' | 'u' | 'x';

export interface SpeechallModel extends IDataObject {
	id?: string;
	model?: string;
	identifier?: string;
	display_name?: string;
	displayName?: string;
	provider?: string;
	description?: string | null;
	cost_per_second_usd?: number | null;
	is_available?: boolean;
	supported_languages?: string[] | null;
	supported_formats?: string[] | null;
	punctuation?: boolean | null;
	diarization?: boolean | null;
	streamable?: boolean | null;
	max_duration_seconds?: number | null;
	max_file_size_bytes?: number | null;
	speaker_labels?: boolean | null;
	word_timestamps?: boolean | null;
	language_detection?: boolean | null;
	custom_vocabulary_support?: boolean | null;
	supports_srt?: boolean;
	supports_vtt?: boolean;
}

export interface NormalizedModel extends IDataObject {
	id: string;
	displayName: string;
	provider?: string;
	isAvailable?: boolean;
	supportedLanguages?: string[];
	supportedFormats: TranscriptOutputFormat[];
	supportsSrt: boolean;
	supportsVtt: boolean;
	diarization?: boolean | null;
	punctuation?: boolean | null;
	wordTimestamps?: boolean | null;
	costPerSecondUsd?: number | null;
	maxFileSizeBytes?: number | null;
	maxDurationSeconds?: number | null;
	raw: SpeechallModel;
}

export type ReplacementRule =
	| {
			kind: 'exact';
			search: string;
			replacement: string;
			caseSensitive?: boolean;
	  }
	| {
			kind: 'regex';
			pattern: string;
			replacement: string;
			flags?: RegexRuleFlag[];
	  }
	| {
			kind: 'regex_group';
			pattern: string;
			groupReplacements: Record<string, string>;
			flags?: RegexRuleFlag[];
	  };

export interface NormalizedTranscriptionItem extends IDataObject {
	text?: string;
	outputFormat: TranscriptOutputFormat;
	model: string;
	language?: string;
	source: SpeechallSource;
	fileUrl?: string;
	sourceUrlSanitized?: string;
	id?: string;
	segments?: unknown[];
	words?: unknown[];
}
