import type {
	ICredentialTestRequest,
	ICredentialType,
	IAuthenticateGeneric,
	INodeProperties,
} from 'n8n-workflow';

export class SpeechallApi implements ICredentialType {
	name = 'speechallApi';

	displayName = 'Speechall API';

	icon = {
		light: 'file:../nodes/Speechall/speechall.svg',
		dark: 'file:../nodes/Speechall/speechall.dark.svg',
	} as const;

	documentationUrl = 'https://docs.speechall.com';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.speechall.com/v1',
			url: '/speech-to-text-models',
			method: 'GET',
		},
	};
}
