require([
		"esri/Map",
		"esri/layers/GeoJSONLayer", 
		"esri/views/MapView", 
		"esri/Graphic",
		"esri/layers/GraphicsLayer", 
		"esri/geometry/coordinateFormatter",
		"esri/geometry/Point", 
		"esri/geometry/SpatialReference",
		"esri/geometry/support/webMercatorUtils"], 
		(
			Map,
			GeoJSONLayer,
			MapView,
			Graphic,
			GraphicsLayer,
			coordinateFormatter,
			Point,
			SpatialReference,
			webMercatorUtils
		) => 
	{

	coordinateFormatter.load();
	

	function get_coord_strings(point_feature) {
		if (point_feature.geometry.spatialReference.isWGS84 === false) {
			prjClkPoint = webMercatorUtils.webMercatorToGeographic(point_feature.geometry);
		} else {
			prjClkPoint = point_feature.geometry;
		};
		let coordDict = {
							"DD" : `${prjClkPoint.latitude} , ${prjClkPoint.longitude}`,  
							"MGRS" : coordinateFormatter.toMgrs(prjClkPoint, "new-180-in-zone-01", 5, false), 
							"GEOCOORD" : (coordinateFormatter.toLatitudeLongitude(prjClkPoint, 'dms', 0)).replace(/\s/g, ''), 
							"Geographic" : coordinateFormatter.toLatitudeLongitude(prjClkPoint, 'dms', 3)
						};	
		
		return coordDict;
	};		

	function build_popup_html(timeZones) {
		let outHtml = '<span class="puHeader">LOCAL TIME ZONE FOR:</span><br>';
	displayCoords = ["MGRS", "GEOCOORD"];	
	for (const [key, value] of Object.entries(clickCoords)) {
			if (key in displayCoords) {
				outHtml += `<span class="puCoordType"><em>&ensp;${key}:</em></span>
							<span class="puCoordVal">${value}</span><br>`;
			}
		};
		
		outHtml += `<br><br><span class="puInna"><em>&ensp;Time Zone INNA Id:</em> ${timeZones[0]}</span><br>`;

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
		};
		console.log(clickCoords);
		return outHtml;
	};

	function get_popup_div(feature) {

		const timeZoneId = feature.graphic.attributes.tzid;

		let tzArray = [timeZoneId, 'UTC'];
		let reducedTz = reduce_time_zones(get_ref_time_zones()).filter(x => !tzArray.includes(x));
		tzArray = tzArray.concat(reducedTz);

		const div = document.createElement("div");
		div.innerHTML = build_popup_html(tzArray);
		return div;
	}

	const url =
	  "data/timeZones.geojson";

	const popupTemplate = {
	  title: "Time Zone Info",
	  content: get_popup_div
	};

	const tzRenderer = {
	  type: "simple",  
	  symbol: { type: "simple-fill" }, 
	  visualVariables: [{
						type: "color",
						field: "tzid",
					  }]
	};

	const tzGeojsonLayer = new GeoJSONLayer({
	  url: url,
	  copyright: "World Time Zone Database",
	  popupTemplate: popupTemplate,
	  renderer: tzRenderer,
	  orderBy: {
		field: "tzid"
	  }
	});

	tzGeojsonLayer.popupTemplate = popupTemplate;

	const map = new Map({
	  basemap: "gray-vector",
	  layers: [tzGeojsonLayer]
	});

	clickPoint = new Point(0, 0);
	// point drop
	const graphicsLayer = new GraphicsLayer();
	map.add(graphicsLayer);
	
	const simpleMarkerSymbol = {
	  type: "simple-marker",
	  color: [255, 194, 10],  // Orange
	  outline: {
				color: [255, 255, 255],
				width: 0.5
			  }
	 };

	const clickPointTemplate = new Graphic({
	  symbol: simpleMarkerSymbol
	});

	const view = new MapView({
	  container: "viewDiv",
	  center: [clickPoint.longitude, clickPoint.latitude],
	  zoom: 1,
	  map: map
	});

	view.on("click", (event) => {
		view.graphics.removeAll();
		const gCopy = clickPointTemplate.clone();
		const clkPnt = view.toMap(event);
		gCopy.geometry = clkPnt;
		view.graphics.add(gCopy);
		
		clickCoords = get_coord_strings(gCopy);
	});        

});


function get_ref_time_zones() {
	const refTimeZones = ['America/New_York', 'America/Chicago',
		'America/Denver', 'America/Los_Angeles'
	];
	return refTimeZones;
};

function get_ref_time_zones() {
	const refTimeZones = ['America/New_York', 'America/Chicago',
		'America/Denver', 'America/Los_Angeles'
	];
	return refTimeZones;
};

function get_current_date_conv(timeZoneId) {
	const datetime = new Date();
	const localDt = datetime.toLocaleDateString('en-US', {
		timeZone: timeZoneId,
	});
	return localDt;
};

function get_current_tz_conv(timeZoneId) {
	const datetime = new Date();
	const localTm = datetime.toLocaleString('en-UK', {
		timeZone: timeZoneId,
		hour: '2-digit',
		minute: '2-digit'
	});
	return localTm;
};

function get_tz_name(timeZoneId) {
	const datetime = new Date();
	const tz_full_name = (datetime.toLocaleString('en-UK', {
		timeZone: timeZoneId,
		timeZoneName: 'long'
	})).match(/[0-9]{2}\s{1}(\D+)/)[1];
	return tz_full_name;
};

function reduce_time_zones(timeZones) {
	let tz_dict = {};
	for (const timeZoneId of timeZones) {
		let tz_name = get_tz_name(timeZoneId);
		tz_dict[tz_name] = timeZoneId;
	}
	return Object.values(tz_dict);
};