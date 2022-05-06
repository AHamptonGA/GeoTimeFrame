var wdcName 	= 'esri_rest_data_sources';
var tableSchema = {};
var url  		= '';

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
	url = document.getElementById('restInput').value;
	tableSchema['alias'] = `ESRI Rest Data Sources for: ${url}`;
	tableSchema['description'] = `ESRI Rest Web Data Connector (WDC) to gather data dources from: ${url}`;
	// set types of services to query	var service_types = ['MapServer', 'FeatureServer'];
	var tableArray = [];

	async function parse_responses(url, folder) {
		if (folder == 'services') {
			dir = 'services';
		} else {
			dir = `services/${folder}`;
		}
		// get server defs
		let prepedUrl = `${url}/${dir}?f=json`;
		let jsonResp = await rest_request(prepedUrl);
		var svr_def = await jsonResp['services'];

		// get services
		for (let i = 0; i < (svr_def).length; i++) {
			if (service_types.includes(svr_def[i]['type'])) {
				let services_name = `${(svr_def[i]['name'])} (${(svr_def[i]['type'])})`;

				let srv_url = `${url}/${folder}/${(svr_def[i]['name'])}/${(svr_def[i]['type'])}`;
				prepedUrl = `${srv_url}?f=json`;
				let svc_def = await rest_request(prepedUrl);

				var dsTypes = ['layers', 'tables'];
				for (let i = 0; i < dsTypes.length; i++) {
					let dsType = dsTypes[i];
					if (svc_def[dsType]) {
						for (let i = 0; i < (svc_def[dsType]).length; i++) {
							let dsName = svc_def[dsType][i]['name'];
							let dsId = svc_def[dsType][i]['id'];
							let ds_url = `${srv_url}/${dsId}`;

							let apiHyper = document.createElement('a');
							apiHyper.href = url;
							let hostUrl = apiHyper.host;
							let urlPath = apiHyper.pathname;

							tableArray.push({
								'url': hostUrl,
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
	let prepedUrl = `${url}/services?f=json`;
	let svcs_root = await rest_request(prepedUrl);


	if (('services' in svcs_root) && ((svcs_root['services']).length > 0)) {
		await parse_responses(url, 'services');
	}

	if (('folders' in svcs_root) && ((svcs_root['folders']).length > 0)) {
		for (let i = 0; i < (svcs_root['folders']).length; i++) {
			// set folder name
			var fldr = svcs_root['folders'][i];
			await parse_responses(url, fldr);
		}
	}

	return (tableArray)
}


(async function() {
	// Create the connector object
	var myConnector = tableau.makeConnector();

	// Define the schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = [{
			id: 'url',
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

		tableSchema = {
			id: wdcName,
			alias: "ESRI Rest Data Sources",
			columns: cols
		};

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = async function(table, doneCallback) {
		tableData = await profile_rest();
		table.appendRows(tableData);
		doneCallback();
	};

	tableau.registerConnector(myConnector);

	// Create event listeners for when the user submits the form
	$(document).ready(function() {
		$("#submitButton").click(function() {
			tableau.connectionName = wdcName;
			tableau.submit(); // This sends the connector object to Tableau
		});
	});
})();
