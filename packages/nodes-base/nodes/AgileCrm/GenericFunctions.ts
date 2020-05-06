import {
	OptionsWithUri
 } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';
import { IContactUpdate, IProperty } from './ContactInterface';


export async function agileCrmApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string,  body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> {

    const credentials = this.getCredentials('agileCrmApi');
	const options: OptionsWithUri = {
		method,
		headers: {
			'Accept': 'application/json',
		},
        auth: {
			username: credentials!.email as string,
			password: credentials!.apiKey as string
		},
		uri: uri || `https://n8nio.agilecrm.com/dev/${endpoint}`,
		json: true
	};

	// Only add Body property if method not GET or DELETE to avoid 400 response
	if(method !== "GET" && method !== "DELETE"){
		options.body = body;
	}

	
	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.errors) {
			const errorMessages = error.response.body.errors.map((e: IDataObject) => e.message);
			throw new Error(`AgileCRM error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		throw error;
	}

}

export async function agileCrmApiRequestUpdate(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method = 'PUT', endpoint?: string,  body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> {
	const baseUri = 'https://n8nio.agilecrm.com/dev/';
    const credentials = this.getCredentials('agileCrmApi');
	const options: OptionsWithUri = {
		method,
		headers: {
			'Accept': 'application/json',
		},
		body: {id: body.id},
        auth: {
			username: credentials!.email as string,
			password: credentials!.apiKey as string
		},
		uri: uri || baseUri,
		json: true
	};

	const successfulUpdates  = [];
	let lastSuccesfulUpdateReturn : any;
	const payload : IContactUpdate = body;
	
	try {
		// Due to API, we must update each property separately 
		if(payload.properties){
			options.body.properties = payload.properties;
			options.uri = baseUri + 'api/contacts/edit-properties';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			// Iterate trough properties and show them as individial updates instead of only vague "properties"
			payload.properties?.map((property : any) => {
				successfulUpdates.push(`${property.name} `);
			});

			delete options.body.properties;
		}
		if(payload.lead_score){
			options.body.lead_score = payload.lead_score;
			options.uri = baseUri + 'api/contacts/edit/lead-score';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			successfulUpdates.push('lead_score');

			delete options.body.lead_score;
		}
		if(body.tags){
			options.body.tags = payload.tags;
			options.uri = baseUri + 'api/contacts/edit/tags';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			payload.tags?.map((tag : string) => {
				successfulUpdates.push(`(Tag) ${tag} `);
			});

			delete options.body.tags;
		}
		if(body.star_value){
			options.body.star_value = payload.star_value;
			options.uri = baseUri + 'api/contacts/edit/add-star';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			successfulUpdates.push('star_value');

			delete options.body.star_value;
		}

		return lastSuccesfulUpdateReturn;

	} catch (error) {

		if (error.response && error.response.body && error.response.body.errors) {
			const errorMessages = error.response.body.errors.map((e: IDataObject) => e.message);
			throw new Error(`AgileCRM error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		throw new Error(`Not all items updated. Updated items: ${successfulUpdates.join(' , ')} \n \n` + error); 
	}

}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
