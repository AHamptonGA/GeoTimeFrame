var restApiUrl 		= "https://cartowfs.nationalmap.gov/arcgis/rest";
var connName 		= "ESRI Rest Metadata";
var service_types 	= ['MapServer', 'FeatureServer'];

/* -------------------------------------------------------------------*/

//Create the connector object
var myConnector	 = tableau.makeConnector();

/* -------------------------------------------------------------------*/
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

	async function parse_responses(restApiUrl, folder) {
		var dir = '';
		if (folder == 'services') {
			dir = 'services';
		} else {
			dir = `services/${folder}`;
		}
		// get server defs
		let dirMetaUrl = `${restApiUrl}/${dir}?f=json`;
		let jsonResp = await rest_request(dirMetaUrl);
		var svr_def = await jsonResp['services'];


		// get services
		for (let i = 0; i < (svr_def).length; i++) {
			if (service_types.includes(svr_def[i]['type'])) {
				let services_name = `${(svr_def[i]['name'])} (${(svr_def[i]['type'])})`;
				let service_type = svr_def[i]['type']; 

				let srv_url = `${restApiUrl}/${folder}/${(svr_def[i]['name'])}/${(svr_def[i]['type'])}`;
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
								'api_rest_url': restApiUrl,
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
	let restMetaUrl = `${restApiUrl}/services?f=json`;

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
	
	let outputArray = [];
	// get dataset schemas
	
	for (let t = 0; t < (tableArray).length; t++) {
		let ds = tableArray[t];
		let newRow = {};
		
		// get server defs
		let tableMetaUrl = `${ds['dataset_url']}?f=json`;
		let jsonResp = await rest_request(tableMetaUrl);
		
		// insert the dataset properties
		Object.keys(ds)
			.forEach(key => newRow[key] = ds[key]);		
			
		for (let [key, value] of Object.entries(jsonResp)) {
			if (value != null && typeof(value) == 'object'){
				newRow[`dataset_${key}`] = JSON.stringify(value);
			}else{
				if (!(Array.isArray(value))){
					newRow[`dataset_${key}`] = value;
				}
			}
		}	

		// fill in null values
		for (let [key, value] of Object.entries(newRow)) {
			if (!(value)){
				newRow[key] = 'N/A';
				}
		}
		outputArray.push(newRow);	
			
		
	}	

	return (outputArray)
}


(async function() {

	var restData 	 =  await profile_rest(restApiUrl);
	
	// Define the tableau schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = [] ; 
		var col_ids = [];
		for (let r = 0; r < (restData).length; r++) {
			for (let [key, value] of Object.entries(restData[r])) {
				if (!(col_ids.includes(key))){
					col_ids.push(key);
				}
			}
		}
		for (let c = 0; c < (col_ids).length; c++) {
			let cId = col_ids[c];
			cols.push(
						{
							id: cId,
							alias: cId,
							description: cId,
							dataType: tableau.dataTypeEnum.string
						}
					);
			}

		var tableSchema = {
			id: connName.replace(/[^a-zA-Z]/g, ""),
			alias: connName,
			description: 'ESRI Rest Web Data Connector (WDC) to gather REST data sources and service metadata',
			columns: cols
		};

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = async function(table, doneCallback) {
		table.appendRows(restData);
		delete tableData;
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
