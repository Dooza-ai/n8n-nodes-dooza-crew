import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

const DONE_STATUSES = ['completed', 'succeeded', 'done', 'failed', 'error', 'cancelled'];

async function crewRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('doozaCrewApi');
	const baseUrl = String(credentials.baseUrl || 'https://crew.dooza.ai').replace(/\/+$/, '');
	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		json: true,
	};
	if (body) options.body = body;
	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'doozaCrewApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as never);
	}
}

export class DoozaCrew implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dooza Crew',
		name: 'doozaCrew',
		icon: { light: 'file:dooza.svg', dark: 'file:dooza.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Give tasks to your Dooza Crew AI employees and get their results',
		defaults: {
			name: 'Dooza Crew',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'doozaCrewApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Task',
						value: 'runTask',
						description: 'Send a task to an agent in your crew',
						action: 'Run a task',
					},
					{
						name: 'Get Task',
						value: 'getTask',
						description: 'Get the status and result of a task',
						action: 'Get a task',
					},
				],
				default: 'runTask',
			},
			{
				displayName: 'Agent',
				name: 'agent',
				type: 'string',
				required: true,
				default: 'master',
				placeholder: 'e.g. master',
				description: 'Agent that should do the task: master (your main agent) or the name of any agent in your crew',
				displayOptions: { show: { operation: ['runTask'] } },
			},
			{
				displayName: 'Task',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				placeholder: 'e.g. Summarize this lead and draft a reply: {{ $json.email }}',
				description: 'What the agent should do, in plain words',
				displayOptions: { show: { operation: ['runTask'] } },
			},
			{
				displayName: 'Wait for Result',
				name: 'waitForResult',
				type: 'boolean',
				default: true,
				description:
					'Whether to wait until the agent finishes and return its answer. If off, returns the task ID right away.',
				displayOptions: { show: { operation: ['runTask'] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['runTask'], waitForResult: [true] } },
				options: [
					{
						displayName: 'Poll Interval (Seconds)',
						name: 'pollInterval',
						type: 'number',
						typeOptions: { minValue: 2 },
						default: 5,
						description: 'How often to check whether the task is finished',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 10 },
						default: 600,
						description: 'Stop waiting after this many seconds and return the latest status',
					},
				],
			},
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				required: true,
				default: '',
				description: 'ID returned by the Run Task operation',
				displayOptions: { show: { operation: ['getTask'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				let result: IDataObject;

				if (operation === 'runTask') {
					const agent = this.getNodeParameter('agent', itemIndex) as string;
					const text = this.getNodeParameter('text', itemIndex) as string;
					const waitForResult = this.getNodeParameter('waitForResult', itemIndex) as boolean;
					if (!text.trim()) {
						throw new NodeOperationError(this.getNode(), 'Task text is empty', { itemIndex });
					}

					result = await crewRequest.call(this, 'POST', '/v1/tasks', { agent, text });

					if (waitForResult) {
						const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
						const pollMs = Math.max(2, Number(options.pollInterval ?? 5)) * 1000;
						const deadline = Date.now() + Math.max(10, Number(options.timeout ?? 600)) * 1000;
						const taskId = String(result.id ?? result.task_id ?? '');
						if (!taskId) {
							throw new NodeOperationError(this.getNode(), 'The API returned no task ID', {
								itemIndex,
							});
						}
						while (!DONE_STATUSES.includes(String(result.status ?? '').toLowerCase())) {
							if (Date.now() > deadline) {
								result.timedOut = true;
								break;
							}
							await sleep(pollMs);
							result = await crewRequest.call(this, 'GET', `/v1/tasks/${encodeURIComponent(taskId)}`);
						}
					}
				} else if (operation === 'getTask') {
					const taskId = this.getNodeParameter('taskId', itemIndex) as string;
					result = await crewRequest.call(this, 'GET', `/v1/tasks/${encodeURIComponent(taskId)}`);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
						itemIndex,
					});
				}

				returnData.push({ json: result, pairedItem: itemIndex });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: itemIndex,
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex });
			}
		}

		return [returnData];
	}
}
