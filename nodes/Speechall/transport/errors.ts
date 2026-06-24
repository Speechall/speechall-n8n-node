import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export function buildNodeApiError(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	response: {
		statusCode?: number;
		headers?: IDataObject;
		body?: unknown;
	},
): NodeApiError {
	const statusCode = response.statusCode;
	const body = sanitizeErrorBody(response.body);
	const retryAfter = getHeader(response.headers, 'retry-after');
	const message = getApiMessage(body);
	const code = isObject(body) ? body.code : undefined;
	const description = [message, typeof code === 'string' ? `Code: ${code}` : undefined]
		.filter(Boolean)
		.join(' ');

	const errorResponse = {
		...(isObject(body) ? body : { body: String(body ?? '') }),
		...(retryAfter ? { retryAfter } : {}),
	} as JsonObject;

	return new NodeApiError(context.getNode(), errorResponse, {
		message: getStatusMessage(statusCode),
		description,
		httpCode: statusCode ? String(statusCode) : undefined,
	});
}

export function toNodeOperationError(
	context: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): NodeOperationError | NodeApiError {
	if (error instanceof NodeApiError) {
		return error;
	}
	if (error instanceof NodeOperationError) {
		error.context = { ...(error.context ?? {}), itemIndex };
		return error;
	}

	return new NodeOperationError(context.getNode(), getErrorMessage(error), { itemIndex });
}

export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return 'Unknown error';
}

export function validateTimeout(context: IExecuteFunctions, timeoutSeconds: number): void {
	if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 900) {
		throw new NodeOperationError(
			context.getNode(),
			'Request Timeout (Seconds) must be between 1 and 900',
		);
	}
}

export function validateTemperature(
	context: IExecuteFunctions,
	temperature: number | undefined,
): void {
	if (temperature === undefined) {
		return;
	}
	if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) {
		throw new NodeOperationError(context.getNode(), 'Temperature must be between 0 and 1');
	}
}

export function validateSpeakersExpected(
	context: IExecuteFunctions,
	speakersExpected: number | undefined,
): void {
	if (speakersExpected === undefined) {
		return;
	}
	if (!Number.isInteger(speakersExpected) || speakersExpected < 1 || speakersExpected > 10) {
		throw new NodeOperationError(context.getNode(), 'Speakers Expected must be between 1 and 10');
	}
}

function getStatusMessage(statusCode: number | undefined): string {
	switch (statusCode) {
		case 400:
			return 'Bad Speechall request';
		case 401:
			return 'Invalid or missing Speechall API key';
		case 402:
			return 'Speechall account has no available credit';
		case 404:
			return 'Speechall resource not found';
		case 429:
			return 'Speechall rate limit exceeded';
		case 500:
			return 'Speechall server error';
		case 503:
			return 'Speechall service unavailable';
		case 504:
			return 'Speechall upstream provider timed out';
		default:
			return statusCode
				? `Speechall API request failed with status ${statusCode}`
				: 'Speechall API request failed';
	}
}

function getApiMessage(body: unknown): string | undefined {
	if (!isObject(body)) {
		return undefined;
	}

	const message = body.message ?? body.error;
	if (typeof message === 'string') {
		return message;
	}
	if (isObject(message) && typeof message.message === 'string') {
		return message.message;
	}
	return undefined;
}

function sanitizeErrorBody(body: unknown): unknown {
	if (!isObject(body)) {
		return body;
	}

	const sanitized: IDataObject = {};
	for (const [key, value] of Object.entries(body)) {
		if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('apikey')) {
			continue;
		}
		if (typeof value === 'string' && isSensitiveUrl(value)) {
			sanitized[key] = sanitizeUrl(value);
		} else {
			sanitized[key] = value;
		}
	}
	return sanitized;
}

function isSensitiveUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.search.length > 0 || url.hash.length > 0;
	} catch {
		return false;
	}
}

function sanitizeUrl(value: string): string {
	const url = new URL(value);
	url.search = '';
	url.hash = '';
	return url.toString();
}

function getHeader(headers: IDataObject | undefined, name: string): string | undefined {
	if (!headers) {
		return undefined;
	}
	const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
	return typeof entry?.[1] === 'string' ? entry[1] : undefined;
}

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
