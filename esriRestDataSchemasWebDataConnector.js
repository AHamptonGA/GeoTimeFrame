var restApiUrl 		= "https://cartowfs.nationalmap.gov/arcgis/rest";
var connName 		= "ESRI Rest Metadata";
var service_types 	= ['MapServer', 'FeatureServer'];

//default values for null data schema properties
var def_schema_props = {'column_alias':'N/A', 'column_defaultValue':'N/A: undefined', 
						'column_editable':'N/A: undefined', 'column_length':'N/A', 
						'column_name':'N/A: undefined','column_nullable':'N/A: undefined', 
						'column_type':'N/A: undefined', 'domain_type':'N/A', 
						'domain_name':'N/A', 'domain_description':'N/A',
						'domain_codedValues':'N/A', 'domain_range':'N/A',
						'modelName':'N/A: undefined'}
						
var restApiUrl 		= '';
var tableData 		= [];
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
								'api_rest_name': common_name,
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
				
		// get server defs
		let tableMetaUrl = `${ds['dataset_url']}?f=json`;
		let jsonResp = await rest_request(tableMetaUrl);
		
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

				// ensure the boolean vlaues get translated
				for (let [key, value] of Object.entries(def_schema_props)) {
					if (typeof newRow[key] == "boolean") {
						var bool_value = newRow[key] == 'true';
						if(bool_value){
							newRow[key] = 'true'; 
						}else{
							newRow[key] = 'false'; 
						}
					}
				}				
				// ensure the column and domain keys exist with default values
				for (let [key, value] of Object.entries(def_schema_props)) {
					if(!(newRow.hasOwnProperty(key))){
						newRow[key] = value; 
					}
				}
				// fill in all other null values
				for (let [key, value] of Object.entries(newRow)) {
					if (!(value)){
						newRow[key] = 'N/A';
						}
				}
				outputArray.push(newRow);	
			}
		}
	}	

	return (outputArray)
}


(async function() {


	// Define the tableau schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = [
			{
				id: 'api_rest_name',
				alias: 'API_Common_Name',
				description: 'Common Name of an ESRI REST API/Server',
				dataType: tableau.dataTypeEnum.string
			}, {				
				id: 'api_rest_url',
				alias: 'API_REST_URL',
				description: 'ESRI REST API/Server URL',
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
			description: 'ESRI Rest Web Data Connector (WDC) to gather REST data sources and service metadata',
			columns: cols
		};

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = async function(table, doneCallback) {
		for (let i = 0; i < (restApiUrls).length; i++) {
			common_name = restApiUrls[i]['common_name'];
			restApiUrl = restApiUrls[i]['url'];
			let tableData =  await profile_rest();
			table.appendRows(tableData);
		}
		
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
