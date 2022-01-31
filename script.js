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


function get_popup_div(feature) {
  
	const timeZoneId = feature.graphic.attributes.tzid;
	const localDt = get_current_date_conv(timeZoneId);
	const localTm = get_current_tz_conv(timeZoneId);
	
	const utcDt = get_current_date_conv('UTC');
	const utcTm = get_current_tz_conv('UTC');
	
	const div = document.createElement("div");
	div.innerHTML =
					`
					<b>INNA ID: </b> ${timeZoneId}<br> 
					<b>LOCAL DATE: </b> ${localDt}<br>
					<b>LOCAL TIME: </b> ${localTm}<br>
					<br>
					<b>UTC:</b><br>
					<b>DATE: </b> ${utcDt}<br>
					<b>TIME: </b> ${utcTm}<br>
					`;
  return div;
};