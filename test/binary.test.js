import { describe, expect, it } from 'vitest';

import {
	buildTranscriptBinaryMetadata,
	supportsTranscriptBinaryOutput,
} from '../nodes/Speechall/helpers/binary';

describe('binary helpers', () => {
	it('identifies text-like transcript formats', () => {
		expect(supportsTranscriptBinaryOutput('text')).toBe(true);
		expect(supportsTranscriptBinaryOutput('srt')).toBe(true);
		expect(supportsTranscriptBinaryOutput('vtt')).toBe(true);
		expect(supportsTranscriptBinaryOutput('json')).toBe(false);
	});

	it('builds binary transcript metadata', () => {
		expect(buildTranscriptBinaryMetadata('vtt')).toEqual({
			fileName: 'speechall-transcript.vtt',
			mimeType: 'text/vtt',
		});
	});
});
