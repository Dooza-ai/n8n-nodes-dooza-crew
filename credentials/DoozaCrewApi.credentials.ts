import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DoozaCrewApi implements ICredentialType {
	name = 'doozaCrewApi';

	displayName = 'Dooza Crew API';

	icon: Icon = { light: 'file:../icons/dooza.svg', dark: 'file:../icons/dooza.dark.svg' };

	documentationUrl = 'https://github.com/Dooza-ai/n8n-nodes-dooza-crew?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your Dooza Crew API key. Find it in the Crew app settings.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://crew.dooza.ai',
			description: 'Leave as is unless Dooza support gives you another URL',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/tasks?limit=1',
			method: 'GET',
		},
	};
}
