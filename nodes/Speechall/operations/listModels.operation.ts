import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	filterModels,
	malformedModelsFromResponse,
	normalizeModelsResponse,
} from '../helpers/models';
import { speechallApiRequest } from '../transport/speechallApiRequest';

export async function listModelsOperation(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const response = await speechallApiRequest.call(this, 'GET', '/speech-to-text-models', {
		timeoutMs: 30_000,
		json: true,
	});

	const filters: IDataObject = {
		provider: this.getNodeParameter('provider', 0, ''),
		availableOnly: this.getNodeParameter('availableOnly', 0, false),
		supportsDiarization: this.getNodeParameter('supportsDiarization', 0, false),
		supportsSrt: this.getNodeParameter('supportsSrt', 0, false),
		supportsVtt: this.getNodeParameter('supportsVtt', 0, false),
		supportsStreaming: this.getNodeParameter('supportsStreaming', 0, false),
	};

	const models = filterModels(normalizeModelsResponse(response.body), filters);
	const malformedModels = malformedModelsFromResponse(response.body);

	return [
		...models.map((model) => ({
			json: model,
		})),
		...malformedModels.map((model) => ({
			json: model,
		})),
	];
}
