var restApiUrl 		= "https://cartowfs.nationalmap.gov/arcgis/rest";
var connName 		= "ESRI Rest Data Schemas";
var service_types 	= ['MapServer', 'FeatureServer'];

//default values for null data schema properties
var def_schema_props = {'column_alias':'N/A', 'column_defaultValue':'N/A', 
						'column_editable':'N/A', 'column_length':'N/A', 
						'column_name':'N/A','column_nullable':'N/A', 
						'column_type':'N/A', 'domain_type':'N/A', 
						'domain_name':'N/A', 'domain_description':'N/A',
						'domain_codedValues':'N/A', 'domain_range':'N/A'}
/* -------------------------------------------------------------------*/

//Create the connector object
var myConnector = tableau.makeConnector();

async function rest_request(prepedUrl) {
	console.log(prepedUrl);
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
	
	schema_array = [];
	// get dataset schemas
	for (let t = 0; t < (tableArray).length; t++) {
		ds = tableArray[t];
				
		// get server defs
		let tableMetaUrl = `${ds['dataset_url']}?f=json`;
		let jsonResp = await rest_request(tableMetaUrl);
		if (!((Object.keys(ds)).includes('fields'))) continue;
	
		var fields = await jsonResp['fields'];
		if (Array.isArray(fields)){
			for (let f = 0; f < (fields).length; f++) {
				let schemaRow = {};
				field = fields[f];
				Object.keys(ds)
					.forEach(key => schemaRow[key] = ds[key]);

				Object.keys(field)
					.forEach(key => schemaRow[`column_${key}`] = field[key]);	
				
				if(schemaRow.hasOwnProperty('domain')){
					if (schemaRow['domain'] != null && typeof(schemaRow['domain']) == 'object'){
						
						for (let [key, value] of Object.entries(schemaRow['domain'])) {
							if (typeof(value) == 'object'){
								schemaRow[`domain_${key}`] = JSON.stringify(value);
							
							}else{
								schemaRow[`domain_${key}`] = value;
							}
						}	
					}
				}	
				
				for (let [key, value] of Object.entries(def_schema_props)) {
					if(!(schemaRow.hasOwnProperty(key))){
						schemaRow[key] = value; 
					}
				}

				schema_array.push(schemaRow);	
			}
		}
	}	
	return (schema_array)
}


(async function() {


	// Define the schema
	myConnector.getSchema = function(schemaCallback) {
		var cols = [
			{
				id: 'api_rest_url',
				alias: 'API_REST_URL',
				description: 'ESRI REST API URL',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'api_directory',
				alias: 'API_Directory',
				description: 'Directory or folder within an ESRI REST API',
				dataType: tableau.dataTypeEnum.string
			}, {
				id: 'api_service',
				alias: "API_Service",
				description: 'Service within an ESRI REST API',
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
			description: 'ESRI Rest Web Data Connector (WDC) to gather data sources',
			columns: cols
		};

		schemaCallback([tableSchema]);
	};

	// Download the data
	myConnector.getData = async function(table, doneCallback) {
		tableData =  await profile_rest(restApiUrl);
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
