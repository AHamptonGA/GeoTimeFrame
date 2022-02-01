function get_current_date_conv(timeZoneId) {
	const datetime = new Date();
	const localDt = datetime.toLocaleDateString('en-US', 
							{timeZone: timeZoneId,});
	return localDt
}

function get_current_tz_conv(timeZoneId) {
	const datetime = new Date();
	const localTm = datetime.toLocaleString('en-UK', 
			{timeZone: timeZoneId, hour: '2-digit', minute:'2-digit'});
	return localTm
}

function get_tz_name(timeZoneId) {
	const datetime = new Date();
	const tz_full_name = (datetime.toLocaleString('en-UK', 
		{timeZone: timeZoneId, timeZoneName: 'long' })
		).match(/[0-9]{2}\s{1}(\D+)/)[1];
	return tz_full_name
}


		
		
function get_popup_div(feature) {
  
	const timeZoneId = feature.graphic.attributes.tzid;
	const localDt = get_current_date_conv(timeZoneId);
	const localTm = get_current_tz_conv(timeZoneId);
	
	const utcDt = get_current_date_conv('UTC');
	const utcTm = get_current_tz_conv('UTC');
	
	const div = document.createElement("div");
	div.innerHTML =
					`
					<h3><b>LOCAL TIME ZONE</b></h3><br>
					<b>NAME: </b> ${get_tz_name}<br>
					<b>INNA ID: </b> ${timeZoneId}<br> 
					<b>DATE: </b> ${localDt}<br>
					<b>TIME: </b> ${localTm}<br>
					<br>
					<h3><b>UTC:</b><h3><br>
					<b>DATE: </b> ${utcDt}<br>
					<b>TIME: </b> ${utcTm}Z<br>
					`;
  return div;
};