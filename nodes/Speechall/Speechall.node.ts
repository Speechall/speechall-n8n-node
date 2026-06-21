import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { speechToTextProperties } from './descriptions/SpeechToText.description';
import { getSpeechToTextModels } from './loadOptions/getSpeechToTextModels';
import { listModelsOperation } from './operations/listModels.operation';
import { transcribeFileOperation } from './operations/transcribeFile.operation';
import { transcribeRemoteUrlOperation } from './operations/transcribeRemoteUrl.operation';
import { getErrorMessage, toNodeOperationError } from './transport/errors';

export class Speechall implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Speechall',
		name: 'speechall',
		icon: { light: 'file:speechall.svg', dark: 'file:speechall.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Transcribe audio using Speechall',
		defaults: {
			name: 'Speechall',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'speechallApi',
				required: true,
			},
		],
		properties: speechToTextProperties,
	};

	methods = {
		loadOptions: {
			getSpeechToTextModels,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'listModels') {
			return [await listModelsOperation.call(this)];
		}

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				if (operation === 'transcribeFile') {
					returnData.push(await transcribeFileOperation.call(this, items[itemIndex], itemIndex));
				} else if (operation === 'transcribeRemoteUrl') {
					returnData.push(
						await transcribeRemoteUrlOperation.call(this, items[itemIndex], itemIndex),
					);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported Speechall operation: ${operation}`,
						{
							itemIndex,
						},
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: getErrorMessage(error),
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw toNodeOperationError(this, error, itemIndex);
			}
		}

		return [returnData];
	}
}
