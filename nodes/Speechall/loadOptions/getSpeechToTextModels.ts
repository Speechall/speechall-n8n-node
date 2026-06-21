import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { modelToOption, normalizeModelsResponse } from '../helpers/models';
import { speechallApiRequest } from '../transport/speechallApiRequest';

export async function getSpeechToTextModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = await speechallApiRequest.call(this, 'GET', '/speech-to-text-models', {
		timeoutMs: 30_000,
		json: true,
	});

	return normalizeModelsResponse(response.body).map(modelToOption);
}
