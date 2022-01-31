async function get_current_tz_conv(timeZoneId) {
	const datetime = new Date();
	const localTZ = datetime.toLocaleDateString('en-US', 
							{timeZone: timeZoneId,});
	return localTZ
}


function get_current_tz_conv(feature) {
  
	const timeZoneId = feature.graphic.attributes.tzid;
	const local_tm = await get_current_tz_conv(timeZoneId);
	
	div.innerHTML =
					`
					<b>INNA ID: </b> {tzid}<br> 
					<b>LOCAL: </b> {local_tm}<br>
					`;
  return div;
};