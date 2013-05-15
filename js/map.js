/**
 * Console for all browser
 */
var method;
var noop = function () {};
var methods = [
	'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
	'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
	'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
	'timeStamp', 'trace', 'warn'
];
var length = methods.length;
var console = (window.console = window.console || {});

while (length--) {
	method = methods[length];

	// Only stub undefined methods.
	if (!console[method]) {
		console[method] = noop;
	}
}

/**
 * Application
 */
var trfk = (function(window, $)
{
	var instance;
	function init()
	{
		/**
		 * @returns {google.maps.Map}
		 */
		var initializeMap = function()
		{
			var container = document.getElementById("map-canvas");
			var params = {
				center:    loadUserLastLocation(),
				zoom:      16,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				streetViewControl: true
			};
			return new google.maps.Map(container, params);
		};

		/**
		 * @param map {google.maps.Map}
		 * @returns {*}
		 */
		var initializeStreetView = function(map)
		{
			var panorama = map.getStreetView();
			panorama.setPov({
				heading: 265,
				pitch:   0
			});
			return panorama;
		}

		/**
		 * @returns {Q.defer().promise}
		 */
		var getUserLocation = function()
		{
			var def = Q.defer();

			// Load from cache
			var lastPos = loadUserLastLocation();
			if (lastPos) {
				console.log('Get user location from cache')
				def.resolve(lastPos);
				return def.promise;
			}

			if(navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function(position) {
					console.log('Renew user location')
					var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
					saveUserLastLocation(pos);
					def.resolve(pos);
				}, function() {
					def.reject(new Error('Kérlek, engedélyezd a helyzeted megosztását!'));
				});
			} else {
				// Browser doesn't support Geolocation
				//throw "UnsupportedBrowserException";
				def.reject(new Error('Nem támogatott böngésző!'));
			}
			return def.promise;
		};

		/**
		 * @param pos {google.maps.LatLng}
		 */
		var showUserLocation = function(pos)
		{
			map.setCenter(pos);
		};

		/**
		 * @param pos {google.maps.LatLng}
		 * @param expire {number}
		 */
		var saveUserLastLocation = function(pos, expire)
		{
			if (!expire) {
				var expire = 60000; // 1 minute
			}
			window.localStorage.setItem('user-last-location-expire', getTime() + expire);
			window.localStorage.setItem('user-last-location-lat', pos.lat());
			window.localStorage.setItem('user-last-location-lng', pos.lng());
		};

		/**
		 * @returns {*}
		 */
		var loadUserLastLocation = function()
		{
			if (!window.localStorage.hasOwnProperty('user-last-location-expire')) {
				return false;
			}
			var expiration = window.localStorage.getItem('user-last-location-expire') * 1;
			if (getTime() > expiration) {
				// cache expired
				clearUserLastLocation();
				return false;
			}

			return new google.maps.LatLng(
				window.localStorage.getItem('user-last-location-lat'),
				window.localStorage.getItem('user-last-location-lng')
			);
		};

		var clearUserLastLocation = function()
		{
			window.localStorage.removeItem('user-last-location-expire');
			window.localStorage.removeItem('user-last-location-lat');
			window.localStorage.removeItem('user-last-location-lng');
		};

		/**
		 * @param userPos {google.maps.LatLng}
		 * @param destinationPos {google.maps.LatLng}
		 * @return {Q.defer().promise} {google.maps.GeocoderResponse}
		 */
		var navigateUserToDestination = function(userPos, destinationPos)
		{
			var def = Q.defer();
			var request = {
				origin:      userPos,
				destination: destinationPos,
				travelMode:  getTransportMode()
			};
			directionsDisplay.setMap(map);
			directionsService.route(request, function(response, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					response.request = request;
					streetView.setPosition(destinationPos);
					directionsDisplay.setDirections(response);
					/*
					// the sollution: http://stackoverflow.com/questions/4813728/change-individual-markers-in-google-maps-directions-api-v3
					var leg = response.routes[ 0 ].legs[ 0 ];
					makeMarker(leg.start_location, icons.start, "Kezdőpont");
					makeMarker(leg.end_location, icons.end, 'Dohánybolt');
					*/
					def.resolve(response);
				} else {
					def.reject(new Error('Hiba történt az útvonal tervezése közben!'));
				}
			});
			return def.promise;
		};

		/**
		 * @param pos {google.maps.LatLng}
		 * @param icon {object}
		 * @param title {string}
		 * @returns {google.maps.Marker}
		 */
		var createMarker = function(pos, icon, title) {
			return new google.maps.Marker({
				position: pos,
				icon:     icon,
				title:    title
			});
		}

		/**
		 * @returns {Array}
		 */
		var getLocationMarkers = function()
		{
			var markers = [];
			var icon = new google.maps.MarkerImage(
				'images/trafik-24x24.png',
				new google.maps.Size(24, 24), // (width,height)
				new google.maps.Point(0, 0),  // The origin point (x,y)
				new google.maps.Point(12, 24) // The anchor point (x,y)
			);
			$(locationDataList).each(function(i, data) {
				var pos = new google.maps.LatLng(data[1], data[0]);
				var marker = createMarker(pos, icon, 'Traffik ' + i);
				google.maps.event.addListener(marker, 'click', function()
				{
					Q.all([
						getUserLocation(),
						marker.getPosition()
					])
						.spread(navigateUserToDestination)
						.then(transformNavigationResponse)
						.then(populateDestionationLayout)
						.done();
				});
				markers.push(marker);
			});
			return markers;
		}

		/**
		 * @param pos {google.maps.LatLng}
		 * @returns {Q.defer().promise}
		 */
		var getLocationInfo = function(pos)
		{
			var def = Q.defer();
			geocoder.geocode({'latLng': pos}, function(results, status){
				if (status == google.maps.GeocoderStatus.OK) {
					def.resolve(results);
				} else {
					def.reject();
				}
			});
			return def.promise;
		}

		var transformNavigationResponse = function(navigationResponse)
		{
			var def = Q.defer();
			var destinationPos = new google.maps.LatLng(
				navigationResponse.request.destination.lat(),
				navigationResponse.request.destination.lng()
			);

			getLocationInfo(destinationPos)
				.then(function(locationInfo)
				{
					var d = navigationResponse.routes[0].legs[0];
					var street_number, route, sublocality, locality;
					$(locationInfo[0].address_components).each(function(i, item) {
						if ($.inArray('street_number', item.types) > -1) {
							street_number = item.short_name;
						} else if ($.inArray('route', item.types) > -1) {
							route = item.short_name;
						} else if ($.inArray('sublocality', item.types) > -1) {
							sublocality = item.short_name;
						} else if ($.inArray('locality', item.types) > -1) {
							locality = item.short_name;
						}
					});
					var title = route + ' ' + street_number + '.';
					var subtitle = locality;
					if (sublocality) {
						// TODO és ha nem egy kerületben van!
						subtitle += ', ' + sublocality;
					}
					def.resolve({
						address:     title,
						address2:    subtitle,
						distance:    getDistanceText(d.distance.value, d.distance.text),
						duration:    getDateText(d.duration.value, d.duration.text),
						destination: destinationPos
					});
				})
				.done();
			return def.promise;
		};

		/**
		 * @param data {object}
		 */
		var populateDestionationLayout = function(data)
		{
			var des  = $('#destination');
			var divs = des.find('.bottom-line > *');
			var src  = getStreetViewImage(data.destination, 100, 100);

			des.find('.top-line > div:first-child')
				.html('<img src="' + src + '" />')
				.find('img')
				.click(function(event) {
					// enable street view
					var toggle = streetView.getVisible();
					streetView.setVisible(!toggle);
				});
			des.find('h1').text(data.address);
			des.find('h2').text(data.address2);
			$(divs.get(0)).text(data.distance);
			$(divs.get(1)).text(data.duration);
		};

		/**
		 * @param meter {number}
		 * @param text {string}
		 * @returns {string}
		 */
		var getDistanceText = function(meter, text)
		{
			if (meter < 100) {
				return 'Pár lépésre';
			} else if (meter > 950) {
				return text;
			}
			return meter + ' méter';
		};

		/**
		 * @param seconds {number}
		 * @param text {string}
		 * @returns {string}
		 */
		var getDateText = function(seconds, text)
		{
			if (seconds < 60) {
				return 'Szempillantás';
			}
			return text;
		};

		/**
		 * @param pos {google.maps.LatLng}
		 * @param sizeX {number}
		 * @param sizeY {number}
		 * @returns {string}
		 */
		var getStreetViewImage = function(pos, sizeX, sizeY)
		{
			return [
				'http://maps.googleapis.com/maps/api/streetview?size=',
				sizeX, 'x', sizeY,
				'&location=', pos.lat(), ',', pos.lng(),
				'&heading=08',
				'&pitch=0',
				'&sensor=false'
			].join('');
		};

		/**
		 * @returns {google.maps.LatLng}
		 */
		var getRandomPoint = function()
		{
			var random = Math.floor(Math.random()*traffikLocationList.length);
			var trafik = locationDataList[random];
			return new google.maps.LatLng(trafik[1], trafik[0]);
		};

		/**
		 * @param mode {google.maps.TravelMode.*}
		 */
		var setTransportMode = function(mode)
		{
			window.localStorage.setItem('user-transport-mode', mode);
			transportMode = mode;
		}

		/**
		 * @returns {google.maps.TravelMode.*}
		 */
		var getTransportMode = function()
		{
			if (window.localStorage.hasOwnProperty('user-transport-mode')) {
				return window.localStorage.getItem('user-transport-mode');
			}
			return google.maps.TravelMode.WALKING;
		}

		/**
		 * @returns {google.maps.Map}
		 */
		var getMap = function()
		{
			return map;
		};

		/**
		 * @returns {number}
		 */
		var getTime = function()
		{
			return (new Date()).getTime();
		};

		/**
		 * @param error
		 */
		var defaultErrorHandler = function(error)
		{
			console.error('Hiba történt!', error.message);
			console.error(error.stack);
		}

		var activateUI = function()
		{
			$('.settings').click(function(event)
			{
				event.stopPropagation();
				$('#destination, #settings-layout').toggleClass('hidden');
				return false;
			});

			$('.legal').click(function(event)
			{
				event.stopPropagation();
				$('#legal').removeClass('hidden');
			});

			$('#legal').find('.btn').click(function(event)
			{
				event.stopPropagation();
				$('#legal').addClass('hidden');
			});

			$('.radio')
				.click(function(event)
				{
					var element = $(event.target);
					if (element.hasClass('radio')) {
						$('#destination').removeClass('hidden');
						$('#settings-layout').addClass('hidden');
					} else if (element.is('input')) {
						setTransportMode(element.attr('value'));
						navigateUserToNearestPoint();
					}
				})
				.find('[value="' + getTransportMode() + '"]')
				.attr('checked', 'checked')
				.parent()
				.addClass('checked');
		};

		var showUserLocation = function()
		{
			Q.fcall(getUserLocation)
				.then(showUserLocation)
				.fail(defaultErrorHandler)
				.done();
		};

		var navigateUserToNearestPoint =  function()
		{
			Q.fcall(getUserLocation)
				.then(function(userLocation) {
					var marker = getNearestPoint(userLocation, markers);
					return [
						userLocation,
						marker.getPosition()
					];
				})
				.spread(navigateUserToDestination)
				.then(transformNavigationResponse)
				.then(populateDestionationLayout)
				.fail(defaultErrorHandler)
				.done();
		};

		/**
		 *
		 * @param pos {google.maps.LatLng}
		 * @param markers {Array}
		 * @returns {google.maps.marker} marker
		 */
		var getNearestPoint = function(pos, markers)
		{
			var nearest = false;
			var min = 10000000;
			$(markers).each(function(i, marker)
			{
				var distance = google.maps.geometry.spherical.computeDistanceBetween(pos, marker.getPosition());
				min = Math.min(distance, min);
				if (min == distance) {
					nearest = marker;
				}
			});
			return nearest;
		}

		/**
		 * INIT CODE
		 */
		var map, streetView, markers, markerCluster, transportMode;
		var directionsDisplay = new google.maps.DirectionsRenderer(/*{suppressMarkers: true}*/);
		var directionsService = new google.maps.DirectionsService();
		var geocoder          = new google.maps.Geocoder();
		/*
		var icons = {
			start: new google.maps.MarkerImage(
				// URL
				'http://mapicons.nicolasmollet.com/wp-content/uploads/mapicons/shape-default/color-e74c3c/shapecolor-color/shadow-1/border-dark/symbolstyle-white/symbolshadowstyle-dark/gradient-no/male-2.png',
				// (width,height)
				new google.maps.Size(32, 37),
				// The origin point (x,y)
				new google.maps.Point(0, 0),
				// The anchor point (x,y)
				new google.maps.Point(16, 37)
			),
			end: new google.maps.MarkerImage(
				// URL
				'http://mapicons.nicolasmollet.com/wp-content/uploads/mapicons/shape-default/color-f1c40f/shapecolor-color/shadow-1/border-dark/symbolstyle-white/symbolshadowstyle-dark/gradient-no/smoking.png',
				// (width,height)
				new google.maps.Size(32, 37),
				// The origin point (x,y)
				new google.maps.Point(0, 0),
				// The anchor point (x,y)
				new google.maps.Point(16, 37)
			)
		};
		*/

		Q.fcall(getUserLocation)
			.then(function(userPos)
			{
				map        = initializeMap();
				streetView = initializeStreetView(map);
				markers    = getLocationMarkers();

				// TODO
				google.maps.event.addListener(directionsDisplay, 'directions_changed', function() {
					console.log('directions_changed TODO')
				});

				markerCluster = new MarkerClusterer(map, markers, {
					maxZoom: 14, gridSize: 45
				});
				activateUI();
				$(document).bind('touchmove', false); // disable scrolling
			})
			.then(navigateUserToNearestPoint)
			.fail(defaultErrorHandler)
			.done();

		return {
			initMap:      initializeMap,
			getLocation:  getUserLocation,
			showLocation: showUserLocation,
			navigateTo:   navigateUserToNearestPoint,
			// FOR DEBUG ONLY
			debug: {
				map: getMap
			}
		};
	}

	return {
		// Get the Singleton instance if one exists
		// or create one if it doesn't
		getInstance: function () {
			if ( !instance ) {
				instance = init();
			}
			return instance;
		}

	};
}(window, jQuery));

$(function() {
	window.traffik = trfk.getInstance();
});