function get_current_tz_conv(timeZoneId) {
	const datetime = new Date();
	const localTZ = datetime.toLocaleDateString('en-US', 
							{timeZone: timeZoneId,});
	return localTZ
}


function get_current_tz_conv(feature) {
  
	const timeZoneId = feature.graphic.attributes.tzid;
	const local_tm = get_current_tz_conv(timeZoneId);
	const div = document.createElement("div");
	div.innerHTML =
					`
					<b>INNA ID: </b> {timeZoneId}<br> 
					<b>LOCAL: </b> {local_tm}<br>
					`;
  return div;
};