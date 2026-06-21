import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseSpeechallBody } from '../helpers/normalize';
import { SPEECHALL_API_BASE_URL } from '../helpers/types';
import { buildNodeApiError } from './errors';

export interface SpeechallApiResponse<T = unknown> {
	statusCode: number;
	headers: IDataObject;
	body: T;
	rawBody?: string | Buffer;
}

export async function speechallApiRequest<T>(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	options: {
		qs?: IDataObject;
		body?: unknown;
		headers?: IDataObject;
		timeoutMs?: number;
		json?: boolean;
		encoding?: 'json' | 'text' | 'arraybuffer';
	} = {},
): Promise<SpeechallApiResponse<T>> {
	const requestOptions: IHttpRequestOptions = {
		baseURL: SPEECHALL_API_BASE_URL,
		url: endpoint,
		method,
		qs: options.qs,
		arrayFormat: 'repeat',
		body: options.body as IHttpRequestOptions['body'],
		headers: {
			Accept: 'application/json, text/plain, */*',
			'User-Agent': 'n8n-nodes-speechall',
			'X-Speechall-Client': 'n8n-nodes-speechall',
			...(options.headers ?? {}),
		},
		timeout: options.timeoutMs,
		json: options.json ?? options.encoding === 'json',
		returnFullResponse: true,
	};

	if (options.encoding) {
		requestOptions.encoding = options.encoding;
	}

	try {
		const response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'speechallApi',
			requestOptions,
		)) as {
			statusCode: number;
			headers: IDataObject;
			body: unknown;
		};

		const contentType = getHeader(response.headers, 'content-type');
		const rawBody =
			typeof response.body === 'string' || Buffer.isBuffer(response.body)
				? response.body
				: undefined;
		const body = (
			options.encoding === 'text' ? response.body : parseSpeechallBody(response.body, contentType)
		) as T;

		return {
			statusCode: response.statusCode,
			headers: response.headers,
			body,
			rawBody,
		};
	} catch (error) {
		const response = extractErrorResponse(error);
		if (response) {
			throw buildNodeApiError(this, response);
		}
		throw new NodeOperationError(this.getNode(), error instanceof Error ? error : String(error));
	}
}

function extractErrorResponse(error: unknown):
	| {
			statusCode?: number;
			headers?: IDataObject;
			body?: unknown;
	  }
	| undefined {
	if (typeof error !== 'object' || error === null) {
		return undefined;
	}
	const candidate = error as {
		statusCode?: number;
		response?: { statusCode?: number; headers?: IDataObject; body?: unknown; data?: unknown };
		headers?: IDataObject;
		body?: unknown;
	};
	if (candidate.response) {
		return {
			statusCode: candidate.response.statusCode,
			headers: candidate.response.headers,
			body: candidate.response.body ?? candidate.response.data,
		};
	}
	if (candidate.statusCode || candidate.body) {
		return {
			statusCode: candidate.statusCode,
			headers: candidate.headers,
			body: candidate.body,
		};
	}
	return undefined;
}

function getHeader(headers: IDataObject | undefined, name: string): string | undefined {
	if (!headers) {
		return undefined;
	}
	const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
	return typeof entry?.[1] === 'string' ? entry[1] : undefined;
}
