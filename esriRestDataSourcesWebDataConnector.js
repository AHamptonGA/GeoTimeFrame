
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


async function profile_rest(restApiUrl) {
	
	// set types of services to query	var service_types = ['MapServer', 'FeatureServer'];
	var tableArray = [];

	async function parse_responses(restApiUrl, folder) {
		var dir = ''; 
		if (folder == 'services') {
			dir = 'services';
		} else {
			dir = `services/${folder}`;
		}
		// get server defs
		let dirMetaUrl = `${restApiUrl}/${dir}?f=json`;
		console.log(dirMetaUrl);
		let jsonResp = await rest_request(dirMetaUrl);
		var svr_def = await jsonResp['services'];

		
		// get services
		for (let i = 0; i < (svr_def).length; i++) {
			if (service_types.includes(svr_def[i]['type'])) {
				let services_name = `${(svr_def[i]['name'])} (${(svr_def[i]['type'])})`;

				let srv_url = `${restApiUrl}/${folder}/${(svr_def[i]['name'])}/${(svr_def[i]['type'])}`;
				console.log(srv_url);
				let serviceUrl = `${srv_url}?f=json`;
				console.log(serviceUrl);
				
				let svc_def = await rest_request(serviceUrl);

				var dsTypes = ['layers', 'tables'];
				for (let i = 0; i < dsTypes.length; i++) {
					let dsType = dsTypes[i];
					if (svc_def[dsType]) {
						for (let i = 0; i < (svc_def[dsType]).length; i++) {
							let dsName = svc_def[dsType][i]['name'];
							let dsId = svc_def[dsType][i]['id'];
							let ds_url = `${srv_url}/${dsId}`;

							let apiHyper = document.createElement('a');
							apiHyper.href = restApiUrl;
							let hostUrl = apiHyper.host;
							let urlPath = apiHyper.pathname;

							tableArray.push({
								'restapi': hostUrl,
								'directory': folder,
								'service': services_name,
								'servicetype': dsType.substring(0, dsType.length - 1),
								'datasettype': dsName,
								'dataset': dsName,
								'datasetid': dsId,
								'dataseturl': ds_url
							});
						}
					}
				}
			}
		}
	}

	// get rest properties
	let restMetaUrl = `${restApiUrl}/services?f=json`;
	console.log(restMetaUrl);
	let svcs_root = await rest_request(restMetaUrl);


	if (('services' in svcs_root) && ((svcs_root['services']).length > 0)) {
		await parse_responses(restApiUrl, 'services');
	}

	if (('folders' in svcs_root) && ((svcs_root['folders']).length > 0)) {
		for (let i = 0; i < (svcs_root['folders']).length; i++) {
			// set folder name
			var fldr = svcs_root['folders'][i];
			await parse_responses(restApiUrl, fldr);
		}
	}

	return (tableArray)
}

function updateFormEnabled() {
	if (verifySelect()) {
		$('#submitButton').prop("disabled", false);
	} else {
		$('#submitButton').prop("disabled", true);
	}
}

function verifySelect() {
	if ($("#inputSel :selected").val() !== '') {
		return true;
	} else {
		return false;
	}
}

async function createTableauConn(restApiUrl, restApiName) {

	//Create the connector object
	var myConnector = tableau.makeConnector();
	
	// Define the schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = [{
			id: 'restapi',
			alias: 'REST API',
			description: 'ESRI REST API URL',
			dataType: tableau.dataTypeEnum.string
		}, {
			id: 'directory',
			alias: 'Directory',
			description: 'Directory or folder within an ESRI REST API',
			dataType: tableau.dataTypeEnum.string
		}, {
			id: 'service',
			alias: "Service",
			description: 'Service within an ESRI REST API',
			dataType: tableau.dataTypeEnum.string
		}, {
			id: 'servicetype',
			alias: "Service_Type",
			description: 'Type of a ESRI REST service (Ex. Map, Feature, Geocode... etc)',
			dataType: tableau.dataTypeEnum.string
		}, {
			id: 'datasettype',
			alias: "Dataset_Type",
			description: 'Dataset type (Ex. table or geospatial layer)',
			dataType: tableau.dataTypeEnum.string
		}, {
			id: 'dataset',
			alias: "Dataset_Name",
			description: 'Dataset name',
			dataType: tableau.dataTypeEnum.string
		}, {
			id: 'datasetid',
			alias: "Dataset_ID",
			description: 'ESRI REST Dataset ID which is unique within a service',
			dataType: tableau.dataTypeEnum.string
		}, {
			id: 'dataseturl',
			alias: "Dataset_URL",
			description: 'Full URL to a dataset endpoint on the REST server',
			dataType: tableau.dataTypeEnum.string
		}];
		
		var tableSchema = {
			id: restApiName,
			alias: `ESRI Rest Data Sources: ${restApiName}`,
			description: `ESRI Rest Web Data Connector (WDC) to gather data sources from: ${restApiUrl}`,
			columns: cols
		};
	
		schemaCallback([tableSchema]);
	};	
	
	// Download the data
	myConnector.getData = async function(table, doneCallback) {
		tableData = await profile_rest(restApiUrl);
		table.appendRows(tableData);
		doneCallback();
	};

	tableau.connectionName = `ESRI Rest Data Sources: ${restApiName}`; // This will be the data source name in Tableau
	tableau.registerConnector(myConnector);	
	tableau.submit(); // This sends the connector object to Tableau
}
	
$(document).ready(function() {

	$('#submitButton').prop("disabled", true);

	$("#inputSel").on('change', function() {
		//alert($("#inputSel :selected").val());
		updateFormEnabled();

	});

	$("#submitButton").click(
		async function() {
			// Create event listeners for when the user submits the form
			var selElm = document.getElementById("inputSel");
			var restApiUrl = selElm.options[selElm.selectedIndex].value;
			var restApiName = (selElm.options[selElm.selectedIndex].text).replace(/[^a-zA-Z]/g, " ");
			
			await createTableauConn(restApiUrl,restApiName);
		}
	);
});