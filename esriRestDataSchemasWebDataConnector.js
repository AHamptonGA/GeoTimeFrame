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

// select the servie types of interest
var service_types 	= ['MapServer', 'FeatureServer'];


//default values for null data schema properties
var columns = ['api_rest_name','api_rest_url','api_directory', 'api_service',
			   'api_service_type','dataset_name', 'dataset_id',
			   'dataset_url',
				
			   'column_alias','column_defaultValue','column_editable',
			   'column_length','column_name','column_nullable', 
			   'column_type','domain_type','domain_name',
			   'domain_description','domain_codedValues','domain_range',
			   'modelName'
			  ]

// null default
const null_default = 'N/A: Undefined';

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

		// check for services, if none, 
		// exit early 
		if (svr_def.length == 0) {
			return; 
		}

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
		
		// iterate the fields to create a new row of properties for each	
		var fields = await jsonResp['fields'];
		if (Array.isArray(fields)){
			for (let f = 0; f < (fields).length; f++) {
				let newRow = {};
				let field = fields[f];
				
				// insert the dataset properties
				Object.keys(ds)
					.forEach(key => newRow[key] = ds[key]);
				
				// insert all field properties
				Object.keys(field)
					.forEach(key => newRow[`column_${key}`] = field[key]);	
					
				// break out the field domain properties
				if(field.hasOwnProperty('domain')){
					if (field['domain'] != null && typeof(field['domain']) == 'object'){
						
						for (let [key, value] of Object.entries(field['domain'])) {
							if (value != null && typeof(value) == 'object'){
								newRow[`domain_${key}`] = JSON.stringify(value);
							
							}else{
								newRow[`domain_${key}`] = value;
							}
						}	
					}
				}	
				for (let [key, value] of Object.entries(def_schema_props)) {
					if (isPrimitive(value)){
						if (value == null){
							newRow[key] = null_default;
						}else if (typeof(value) == "boolean"){
							var bool_value = value == 'true';
							if(bool_value){
								newRow[key] = 'true';
							}else{
								newRow[key] = 'false';
							}					
						}else{
							newRow[key] = value;
						}
					}else if (Array.isArray(value)){
						// do nothing
						//newRow[key] = value.toString();
					}else if (typeof(value) == "object"){
						try {
							newRow[key] = JSON.stringify(value);
						}
						catch(err) {
							//do nothing
						}
					}					
				}
				
				// attribute remaining nulls
				for (let c = 0; c < (columns).length; c++) {
					let col = columns[c];
					
					if ((!(newRow[col])) && (!(newRow[col] == 0))) {
						newRow[col] = null_default;
					}
				}
				outputArray.push(newRow);	
			}
		}
	}	

	return (outputArray);
}


(async function() {


	// Define the tableau schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = [
			{
				id: 'dataset_url',
				alias: "Dataset_URL",
				description: 'Full URL to a dataset endpoint on the REST server',
				dataType: tableau.dataTypeEnum.string
				
			/* schema -------------------------------------------------------------- */
			}, {
				id: 'column_name',
				alias: "Column_Name",
				description: 'ESRI field/column name',
				dataType: tableau.dataTypeEnum.string	
			}, {
				id: 'column_alias',
				alias: "Column_Alias",
				description: 'ESRI field/column alias',
				dataType: tableau.dataTypeEnum.string			
			}, {
				id: 'column_type',
				alias: "Column_Type",
				description: 'ESRI field/column type',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'column_length',
				alias: "Column_Length",
				description: 'Field/column length (string types only)',
				dataType: tableau.dataTypeEnum.string			
			}, {
				id: 'column_nullable',
				alias: "Column_Nullable",
				description: 'Indicates whether a field/column can be null',
				dataType: tableau.dataTypeEnum.string			
			}, {
				id: 'column_defaultValue',
				alias: "Column_Default_Value",
				description: 'Field/column default value set for the field.',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'column_editable',
				alias: "Column_Editable",
				description: 'Indicates whether the field/column is editable',
				dataType: tableau.dataTypeEnum.string			
			/* domains ------------------------------------------------------------- */
			}, { 
				id: 'domain_type',
				alias: "Domain_Type",
				description: 'Type of ESRI domain (coded or range)',
				dataType: tableau.dataTypeEnum.string	
			}, {
				id: 'domain_name',
				alias: "Domain_Name",
				description: 'Name of ESRI domain inside of SDE database',
				dataType: tableau.dataTypeEnum.string	
			}, {
				id: 'domain_description',
				alias: "Domain_Description",
				description: 'Description text for an ESRI domain',
				dataType: tableau.dataTypeEnum.string	
			}, {
				id: 'domain_codedValues',
				alias: "Domain_Coded_Values",
				description: 'Dropdown/Lookup values for coded field values (coded value domains only)',
				dataType: tableau.dataTypeEnum.string					
			}, {
				id: 'domain_range',
				alias: "Domain Range Values",
				description: 'Allowed range values (min/max) for a numeric field (range domains only)',
				dataType: tableau.dataTypeEnum.string					
			}		
		];

		var tableSchema = {
			id: connName.replace(/[^a-zA-Z]/g, ""),
			alias: connName,
			description: 'ESRI Rest Web Data Connector (WDC) to gather REST data schemas and data source metadata',
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
