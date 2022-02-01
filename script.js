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
			
function build_popup_html(timeZones) {
	let outHtml = '<b>LOCAL TIME ZONE:</b><br>';
	outHtml += `<b>INNA ID:</b> ${timeZones[0]}<br>`;
	
	for (const timeZoneId of timeZones) {
		let tzName = get_tz_name(timeZoneId);
		let tzDate = get_current_date_conv(timeZoneId);
		let tzTime = get_current_tz_conv(timeZoneId);
		consol.log(tzName, tzDate, tzTime);
		outHtml += `<b>${tzName}:</b><br>
					<b>DATE:</b> ${tzDate}<br>
					<b>TIME:</b> ${tzTime}<br>`;
	}
	consol.log(outHtml);
	return outHtml;
}		

function get_popup_div(feature) {
 
	const timeZoneId = feature.graphic.attributes.tzid;
	const localDt = get_current_date_conv(timeZoneId);
	const localTm = get_current_tz_conv(timeZoneId);
	const localTZName = get_tz_name(timeZoneId);

	let tzArray = [timeZoneId, 'UTC']; 
	let reducedTz = reduce_time_zones(refTimeZones).filter(x => !tzArray.includes(x));
	tzArray = tzArray.concat(reducedTz);
	consol.log(tzArray);	
	const div = document.createElement("div");
	div.innerHTML = build_popup_html(tzArray);
  return div;
};