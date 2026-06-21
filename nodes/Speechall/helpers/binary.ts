import type {
	IBinaryData,
	IBinaryKeyData,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import type { TranscriptOutputFormat } from './types';

const TEXT_BINARY_METADATA: Record<
	Extract<TranscriptOutputFormat, 'text' | 'srt' | 'vtt'>,
	{ extension: string; mimeType: string }
> = {
	text: { extension: 'txt', mimeType: 'text/plain' },
	srt: { extension: 'srt', mimeType: 'application/x-subrip' },
	vtt: { extension: 'vtt', mimeType: 'text/vtt' },
};

export function supportsTranscriptBinaryOutput(
	outputFormat: TranscriptOutputFormat,
): outputFormat is 'text' | 'srt' | 'vtt' {
	return outputFormat === 'text' || outputFormat === 'srt' || outputFormat === 'vtt';
}

export function buildTranscriptBinaryMetadata(outputFormat: 'text' | 'srt' | 'vtt'): {
	fileName: string;
	mimeType: string;
} {
	const metadata = TEXT_BINARY_METADATA[outputFormat];
	return {
		fileName: `speechall-transcript.${metadata.extension}`,
		mimeType: metadata.mimeType,
	};
}

export async function addTranscriptBinaryOutput(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	text: string,
	outputFormat: 'text' | 'srt' | 'vtt',
	binaryPropertyName: string,
): Promise<IBinaryKeyData> {
	const { fileName, mimeType } = buildTranscriptBinaryMetadata(outputFormat);
	const binary = { ...(item.binary ?? {}) };
	const prepared = await this.helpers.prepareBinaryData(
		Buffer.from(text, 'utf8'),
		fileName,
		mimeType,
	);
	binary[binaryPropertyName] = prepared as IBinaryData;
	return binary;
}
