const wdcName 		= 'esri_rest_data_sources'; 
const rest_props 	= {};
var restUrl 			= '';


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
	restUrl = document.getElementById('restInput');
	console.log(restUrl);
	// set types of services to query
	var service_types = ['MapServer', 'FeatureServer'];
	var tableArray = [];

	async function parse_responses(restUrl, folder) {
		if (folder == 'services') {
			dir = 'services';
		} else {
			dir = `services/${folder}`;
		}
		// get server defs
		prepedUrl = `${restUrl}/${dir}?f=json`;
		let jsonResp = await rest_request(prepedUrl);
		var svr_def = await jsonResp['services'];

		// get services
		for (let i = 0; i < (svr_def).length; i++) {
			if (service_types.includes(svr_def[i]['type'])) {
				let services_name = `${(svr_def[i]['name'])} (${(svr_def[i]['type'])})`;

				let srv_url = `${restUrl}/${folder}/${(svr_def[i]['name'])}/${(svr_def[i]['type'])}`;
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
							apiHyper.href = restUrl;
							let hostUrl = apiHyper.host;
							let urlPath = apiHyper.pathname;

							tableArray.push({
								'url': hostUrl,
								'directory': folder,
								'service': services_name,
								'servicetype': dsType.substring(0, dsType.length - 1),
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
	let prepedUrl = `${restUrl}/services?f=json`;
	let svcs_root = await rest_request(prepedUrl);


	if (('services' in svcs_root) && ((svcs_root['services']).length > 0)) {
		await parse_responses(restUrl, 'services');
	}

	if (('folders' in svcs_root) && ((svcs_root['folders']).length > 0)) {
		for (let i = 0; i < (svcs_root['folders']).length; i++) {
			// set folder name
			var fldr = svcs_root['folders'][i];
			await parse_responses(restUrl, fldr);
		}
	}
	rest_props[restUrl] = JSON.stringify(tableArray);
	return(tableArray)
}

								
(async function() {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Define the schema
    myConnector.getSchema = function(schemaCallback) {
        var cols = [{
            id: 'url',
	    alias: 'ReST API',
            dataType: tableau.dataTypeEnum.string
        }, {
            id: 'directory',
	    alias: 'Directory',
            dataType: tableau.dataTypeEnum.string
        }, {
	    id: 'service',
            alias: "Services",
            dataType: tableau.dataTypeEnum.string
        }, {
	    id: 'servicetype',		
            alias: "Service_Type",
            dataType: tableau.dataTypeEnum.string
        }, {
	    id: 'dataset',		
            alias: "Dataset",
            dataType: tableau.dataTypeEnum.string
        }, {
	    id: 'datasetid',		
            alias: "Dataset_ID",
            dataType: tableau.dataTypeEnum.string
        }, {
	    id: 'dataseturl',		
            alias: "Dataset_URL",
            dataType: tableau.dataTypeEnum.string			
        }];

        var tableSchema = {
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
		tableSchema
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
