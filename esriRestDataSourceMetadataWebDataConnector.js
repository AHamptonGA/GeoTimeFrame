//Globals
/* -------------------------------------------------------------------*/
// use the query params to pass the api name and url
var urlSearchParams = new URLSearchParams(window.location.search);
var queryParams = Object.fromEntries(urlSearchParams.entries());
// get the parmas for the function profile_rest()
var esriRestUrl 	= queryParams['esriRestUrl'];
var esriRestName 	= queryParams['esriRestName'];

//set the connection name
var connName 		= `ESRI Rest Data Schemas: ${esriRestName}`;

// selec tthe servie types of interest
var service_types 	= ['MapServer', 'FeatureServer'];

// array to hold column names
var columns = [
				'api_rest_name','api_rest_url','api_directory', 'api_service',
				'api_service_type','dataset_name', 'dataset_id',
				'dataset_url',

				'dataset_type', 'dataset_description', 'dataset_geometryType', 
				'dataset_geometryField', 'dataset_extent', 'dataset_sourceSpatialReference', 
				'dataset_supportsDatumTransformation','dataset_capabilities', 

				'dataset_currentVersion', 'dataset_supportedQueryFormats', 
				'dataset_maxRecordCount', 'dataset_supportsPagination', 
				'dataset_supportsAdvancedQueries', 'dataset_useStandardizedQueries', 
				'dataset_supportsHavingClause','dataset_supportsCountDistinct', 
				'dataset_supportsOrderBy', 'dataset_supportsDistinct', 
				'dataset_supportsTrueCurve','dataset_supportsReturningQueryExtent',
				'dataset_supportsQueryWithDistance','dataset_supportsSqlExpression',

				 
				'dataset_dateFieldsTimeReference', 
				'dataset_copyrightText', 
				'dataset_isDataVersioned',
				'dataset_hasAttachments',
				'dataset_supportsStatistics',
				'dataset_supportsCoordinatesQuantization'
				];

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
			return jsonResp;
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
	
	let outputArray = [];
	// get dataset schemas
	
	for (let t = 0; t < (tableArray).length; t++) {
		let ds = tableArray[t];
				
		// get server defs
		let tableMetaUrl = `${ds['dataset_url']}?f=json`;
		let jsonResp = await rest_request(tableMetaUrl);
		var newRow = {};
		
		// insert the server/dataset ID properties
		Object.keys(ds)
			.forEach(key => newRow[key] = ds[key]);
		
		// pass the val inside Object() to check if the value is
		// equal to Object(value). If the value is equal then the
		// value is primitive else not primitive 
		// (string, boolean, number, null). 
		function isPrimitive(val) {
			if(val === Object(val)){
				return false;
			}else{
				return true;
			}
		}

		// insert all dataset metadata properties
		// iterate the json keys to create a new row of properties for each	
		Object.keys(jsonResp).forEach(function(key) {
			value = jsonResp[key] ;
			
			var col_name = key.replace(/[^a-zA-Z]/g, "_");		
			if (isPrimitive(value)){
				if (value == null){
					newRow[`dataset_${col_name}`] = 'N/A';
				}else if (typeof(value) == "boolean"){
					var bool_value = value == 'true';
					if(bool_value){
						newRow[`dataset_${col_name}`] = 'true';
					}else{
						newRow[`dataset_${col_name}`] = 'false';
					}					
				}else{
					newRow[`dataset_${col_name}`] = value;
				}
			}else if (Array.isArray(value)){
				// do nothing
				//newRow[`dataset_${col_name}`] = value.toString();
			}else if (typeof(value) == "object"){
				try {
					newRow[`dataset_${col_name}`] = JSON.stringify(value);
				}
				catch(err) {
					//do nothing
				}
			}
		})
		
		for (let c = 0; c < (columns).length; c++) {
			let col = columns[c];
			if ((!(newRow[col])) || (newRow[col].replace(/\s+/g, '')) == '' ){
				newRow[col] = 'N/A: Undefined';
			}
		}
	
		outputArray.push(newRow);	
	}

	
	return (outputArray);
}


(async function() {

	// Define the tableau schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = []; 
		
		for (let c = 0; c < (columns).length; c++) {
			let col = columns[c];
			if (col.startsWith("dataset_")){
				let orig_name = col.replace('dataset_','') ;
				var desc = `ESRI REST dataset property: ${orig_name}. See ESRI documentation for more info: https://developers.arcgis.com/rest/services-reference/enterprise`;
			}else{
				var desc = `ESRI REST server property: ${col}. See ESRI documentation for more info`;
			}
			cols.push(
						{
							id: col,
							alias: col,
							description: desc,
							dataType: tableau.dataTypeEnum.string
						}
					)
			}
		
		
		var tableSchema = {
			id: connName.replace(/[^a-zA-Z]/g, ""),
			alias: connName,
			description: 'ESRI Rest Web Data Connector (WDC) to gather REST data sources and metadata',
			columns: cols
		};

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = async function(table, doneCallback) {
		// return data array
		var tableData = await profile_rest();
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
