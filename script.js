async function get_current_tz_conv(timeZoneId) {
	
	let datetime = new Date();
	
	let localTZ = datetime.toLocaleDateString('en-US', 
							{timeZone: timeZoneId,});
	return localTZ
}