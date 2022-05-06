const wdcName 		= 'esri_rest_data_sources'; 
var url 			= '';


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


async function profile_rest(url) {
	
	// set types of services to query
	var service_types = ['MapServer', 'FeatureServer'];
	var tableArray = [];

	async function parse_responses(url, folder) {
		if (folder == 'services') {
			dir = 'services';
		} else {
			dir = `services/${folder}`;
		}
		// get server defs
		prepedUrl = `${url}/${dir}?f=json`;
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

							tableArray.push({
								'apiurl': `${url}`,
								'directory': `${folder}`,
								'service': `${services_name}`,
								'servicetype': `${dsType.substring(0, dsType.length - 1)}`,
								'dataset': `${dsName}`,
								'datasetid': `${dsId}`,
								'dataseturl': `${ds_url}`,
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
	return(tableArray)
}

								
async function buildConnector(url) {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Define the schema
    myConnector.getSchema = function(schemaCallback) {
        var cols = [{
            id: 'apiurl',
			alias: 'REST API',
			description: 'ESRI REST API URL',
            dataType: tableau.dataTypeEnum.string
        }, {
            id: 'directory',
			alias: 'Directory',
			description: 'ESRI REST folder name',
            dataType: tableau.dataTypeEnum.string
        }, {
			id: 'service',
            alias: "Services",
			description: 'ESRI REST service name',
            dataType: tableau.dataTypeEnum.string
        }, {
			id: 'servicetype',		
            alias: "Service_Type",
			description: 'ESRI REST service type',
            dataType: tableau.dataTypeEnum.string
        }, {
			id: 'dataset',		
            alias: "Dataset",
			description: 'Name of an individual feature or table of an ESRI REST endpoint',
            dataType: tableau.dataTypeEnum.string
        }, {
	    id: 'datasetid',		
            alias: "Dataset_ID",
			description: 'ID representing a individual feature or table of an ESRI REST endpoint',
            dataType: tableau.dataTypeEnum.string
        }, {
			id: 'dataseturl',		
            alias: "Dataset_URL",
			description: 'Full resource URL for an individual feature or table of an ESRI REST endpoint',
            dataType: tableau.dataTypeEnum.string			
        }];

        var tableSchema = {
            id: wdcName,
            alias: `ESRI Rest Data Sources for: ${url}`,
            columns: cols
        };

        schemaCallback([tableSchema]);
    };

    // Download the data
    myConnector.getData = async function(table, doneCallback) {
        tableData = await profile_rest(url);
		table.appendRows(tableData);
		doneCallback();
    };

    tableau.registerConnector(myConnector);
}

	
function onSubmitButton(){
	url = document.getElementById('restInput');
	buildConnector(url);
	tableau.connectionName = wdcName; 
	tableau.submit(); // This sends the connector object to Tableau	
}

