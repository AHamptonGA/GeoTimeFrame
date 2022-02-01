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


refTimeZones = ['UTC','America/New_York', 'America/Chicago', 'America/Indiana/Indianapolis', 'America/Denver'];

function reduce_time_zones(timeZones) {
	let tz_dict = {};    
	for (const timeZoneId of timeZones) {
		let tz_name = get_tz_name(timeZoneId);
		
		tz_dict[tz_name] = timeZoneId
	}
	return Object.values(tz_dict) ;
}
			
		
function get_popup_div(feature, refTimeZones) {
 
	const timeZoneId = feature.graphic.attributes.tzid;
	const localDt = get_current_date_conv(timeZoneId);
	const localTm = get_current_tz_conv(timeZoneId);
	const localTZName = get_tz_name(timeZoneId);

	let tzArray = [timeZoneId, 'UTC']; 
	let reducedTz = reduce_time_zones(refTimeZones).filter(
							x => !tzArray.includes(x));
	tzArray.concat(reducedTz);
	console.log(tzArray)

	
	const utcDt = get_current_date_conv('UTC');
	const utcTm = get_current_tz_conv('UTC');
	const utcTzName = get_tz_name('UTC');
	
	const div = document.createElement("div");
	div.innerHTML =
					`
					<b>LOCAL TIME ZONE:</b><br>
					<b>NAME: </b> ${localTZName}<br>
					<b>INNA ID: </b> ${timeZoneId}<br> 
					<b>DATE: </b> ${localDt}<br>
					<b>TIME: </b> ${localTm}<br>
					<br>
					<b>${utcTzName}:</b><br>
					<b>DATE: </b> ${utcDt}<br>
					<b>TIME: </b> ${utcTm}Z<br>
					`;
  return div;
};