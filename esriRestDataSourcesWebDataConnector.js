//Globals
/* -------------------------------------------------------------------*/
// use the query params to pass the api name and url
var urlSearchParams = new URLSearchParams(window.location.search);
var queryParams = Object.fromEntries(urlSearchParams.entries());
// get the parmas for the function profile_rest()
var esriRestUrl 	= queryParams['esriRestUrl'];
var esriRestName 	= queryParams['esriRestName'];

//set the connection name
var connName 		= `ESRI Rest Data Sources: ${esriRestName}`;

// selec tthe servie types of interest
var service_types 	= ['MapServer', 'FeatureServer'];
/* -------------------------------------------------------------------*/

//Create the connector object
var myConnector = tableau.makeConnector();

async function rest_request(prepedUrl) {
	try {
		response = await fetch(prepedUrl);

		if (!response.ok) {
			throw new Error(`Error! status: ${response.status}`);
		} else {
			jsonResp = await response.json();
			return jsonResp
		}

	} catch (err) {
		console.log(err);
	}
}


async function profile_rest() {

	// set types of services to query	
	var tableArray = [];

	async function parse_responses(esriRestUrl, folder) {
		var dir = '';
		if (folder == 'services') {
			dir = 'services';
		} else {
			dir = `services/${folder}`;
		}
		// get server defs
		let dirMetaUrl = `${esriRestUrl}/${dir}?f=json`;
		let jsonResp = await rest_request(dirMetaUrl);
		var svr_def = await jsonResp['services'];


		// get services
		for (let i = 0; i < (svr_def).length; i++) {
			if (service_types.includes(svr_def[i]['type'])) {
				let services_name = `${(svr_def[i]['name'])} (${(svr_def[i]['type'])})`;
				let service_type = svr_def[i]['type']; 

				let srv_url = `${esriRestUrl}/${folder}/${(svr_def[i]['name'])}/${(svr_def[i]['type'])}`;
				let serviceUrl = `${srv_url}?f=json`;
				let svc_def = await rest_request(serviceUrl);

				var dsTypes = ['layers', 'tables'];
				for (let i = 0; i < dsTypes.length; i++) {
					let dsType = dsTypes[i];
					if (svc_def[dsType]) {
						for (let i = 0; i < (svc_def[dsType]).length; i++) {
							let dsName = svc_def[dsType][i]['name'];
							let dsId = svc_def[dsType][i]['id'];
							let ds_url = `${srv_url}/${dsId}`;

							tableArray.push({
								'api_rest_name': esriRestName,
								'api_rest_url': esriRestUrl,
								'api_directory': folder,
								'api_service': services_name,
								'api_service_type': service_type,
								'dataset_type': dsType.substring(0, dsType.length - 1),
								'dataset_name': dsName,
								'dataset_id': dsId,
								'dataset_url': ds_url
							});
						}
					}
				}
			}
		}
	}

	// get rest properties
	let restMetaUrl = `${esriRestUrl}/services?f=json`;

	let svcs_root = await rest_request(restMetaUrl);


	if (('services' in svcs_root) && ((svcs_root['services']).length > 0)) {
		await parse_responses(esriRestUrl, 'services');
	}

	if (('folders' in svcs_root) && ((svcs_root['folders']).length > 0)) {
		for (let i = 0; i < (svcs_root['folders']).length; i++) {
			// set folder name
			var fldr = svcs_root['folders'][i];
			await parse_responses(esriRestUrl, fldr);
		}
	}

	return (tableArray)
}


(async function() {


	// Define the schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = [
			{
				id: 'api_rest_name',
				alias: 'API_REST_Name',
				description: 'Common Name of an ESRI REST API/Server',
				dataType: tableau.dataTypeEnum.string
			}, {				
				id: 'api_rest_url',
				alias: 'API_REST_URL',
				description: 'ESRI REST API/Server URL',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'api_directory',
				alias: 'API_Directory',
				description: 'Directory or folder within an ESRI REST API/Server',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'api_service',
				alias: "API_Service",
				description: 'Service within an ESRI REST API/Server',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'api_service_type',
				alias: "API_Service_Type",
				description: 'Type of a ESRI REST service (Ex. Map, Feature, Geocode... etc)',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'dataset_type',
				alias: "Dataset_Type",
				description: 'Dataset type (Ex. table or geospatial layer)',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'dataset_name',
				alias: "Dataset_Name",
				description: 'Dataset name',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'dataset_id',
				alias: "Dataset_ID",
				description: 'ESRI REST Dataset ID which is unique within a service',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'dataset_url',
				alias: "Dataset_URL",
				description: 'Full URL to a dataset endpoint on the REST server',
				dataType: tableau.dataTypeEnum.string
			}
		];

		var tableSchema = {
			id: connName.replace(/[^a-zA-Z]/g, ""),
			alias: connName,
			description: 'ESRI Rest Web Data Connector (WDC) to gather data sources and metadata',
			columns: cols
		};

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = async function(table, doneCallback) {
		let tableData =  await profile_rest();
		table.appendRows(tableData);  
		doneCallback();
	};
	
	tableau.registerConnector(myConnector);
 	
})();

$(document).ready(function() {

	// Create event listeners for when the user submits the form
	$("#submitButton").click(
		function() {
			
			// name the data source name in Tableau	
			tableau.connectionName = connName; 	
			// send the connector object to Tableau
			tableau.submit(); 
		}
	);
});
