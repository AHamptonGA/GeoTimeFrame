function get_ref_time_zones() {
	const refTimeZones = ['America/New_York', 'America/Chicago',
		'America/Denver', 'America/Los_Angeles'
	];
	return refTimeZones;
}

function get_current_date_conv(timeZoneId) {
	const datetime = new Date();
	const localDt = datetime.toLocaleDateString('en-US', {
		timeZone: timeZoneId,
	});
	return localDt;
}

function get_current_tz_conv(timeZoneId) {
	const datetime = new Date();
	const localTm = datetime.toLocaleString('en-UK', {
		timeZone: timeZoneId,
		hour: '2-digit',
		minute: '2-digit'
	});
	return localTm;
}

function get_tz_name(timeZoneId) {
	const datetime = new Date();
	const tz_full_name = (datetime.toLocaleString('en-UK', {
		timeZone: timeZoneId,
		timeZoneName: 'long'
	})).match(/[0-9]{2}\s{1}(\D+)/)[1];
	return tz_full_name;
}

function reduce_time_zones(timeZones) {
	let tz_dict = {};
	for (const timeZoneId of timeZones) {
		let tz_name = get_tz_name(timeZoneId);
		tz_dict[tz_name] = timeZoneId;
	}
	return Object.values(tz_dict);
}

function build_popup_html(timeZones) {
	let outHtml = '<span class="puHeader">LOCAL TIME ZONE:</span><br>';
	outHtml += `<span class="puInna"><em>&ensp;INNA ID:</em> ${timeZones[0]}</span><br>`;

	for (const timeZoneId of timeZones) {
		let tzName = get_tz_name(timeZoneId);
		let tzDate = get_current_date_conv(timeZoneId);
		let tzTime = get_current_tz_conv(timeZoneId);

		if (timeZones.indexOf(timeZoneId) === 1) {
			refTzStr = `<span class="puRefTz"><em>Reference Time Zones:</em></span><br>`;
		} else {
			refTzStr = '';
		}

		outHtml += `${refTzStr}
					<span class="puTzName"><em>&ensp;${tzName}:</em></span><br>
					<span class="puDate"><em>&emsp;-DATE:</em> ${tzDate}</span><br>
					<span class="puTime"><em>&emsp;-TIME:</em> ${tzTime}</span><br>
					<br>
					`;
	}
	return outHtml;
}

function createPoint(lat,lon, wkid){
	let pt = new Point({
	  x: lon,
	  y: lat,
	  spatialReference: wkid
	});
} 

function get_popup_div(feature) {

	const timeZoneId = feature.graphic.attributes.tzid;
	let lat = feature.graphic.geometry.centroid.latitude;
	let lon = feature.graphic.geometry.centroid.longitude;
	let wkid = feature.graphic.geometry.spatialReference.wkid;
	createPoint(lat, lon, wkid);
	
	let tzArray = [timeZoneId, 'UTC'];
	let reducedTz = reduce_time_zones(get_ref_time_zones()).filter(x => !tzArray.includes(x));
	tzArray = tzArray.concat(reducedTz);

	const div = document.createElement("div");
	div.innerHTML = build_popup_html(tzArray);
	return div;
}

