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
		 * Variables
		 */
		var map, streetView, markers, markerCluster, transportMode;
		var directionsDisplay = new google.maps.DirectionsRenderer();
		var directionsService = new google.maps.DirectionsService();
		var geocoder          = new google.maps.Geocoder();


		/**
		 * Running application by device
		 */
		var initByDevice = function()
		{
			var start = function()
			{
				$('#install').remove();
				$('#map-canvas, #destination, #settings, #legal').show();
				initializeApp();
			};

			if (browser.isStandaloneApp()) {
				// telepített alkalmazás, indítás
				start();
			} else if (browser.isMobileSafari()) {
				$('#run').remove();
				addToHome.show();
			} else {
				// minden más, gomb után mehet a menet!
				$('#run').click(start);
			}
		};

		/**
		 * Standard app start
		 */
		var initializeApp = function()
		{
			Q.fcall(checkSoftwareUpdate)
				.then(user.getLocation)
				.then(function(userPos)
				{
					var markerParams  = {
						maxZoom:  14,
						gridSize: 45
					};

					if (browser.isAndroid()) {
						initAndroid();
					}

					map           = initializeMap();
					streetView    = initializeStreetView(map);
					markers       = getLocationMarkers(locationDataList, marker.selfNavigationClick);
					markerCluster = new MarkerClusterer(map, markers, markerParams);

					/* TODO handle hiding markers because layout hangs on map
					 google.maps.event.addListener(directionsDisplay, 'directions_changed', function() {
					 console.log('directions_changed TODO')
					 });
					 */

					activateUI();
					$(document).bind('touchmove', false); // disable scrolling
				})
				.then(navigateUserToNearestPoint)
				.fail(defaultErrorHandler)
				.done();
		};

		/**
		 * @returns {google.maps.Map}
		 */
		var initializeMap = function()
		{
			var container = document.getElementById("map-canvas");
			var params = {
				center:    user.loadLastLocation()||getDefaultLocation(),
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
		};

		/**
		 * Init Android specific resources
		 *
		 * @returns {boolean}
		 */
		var initAndroid = function()
		{
			window.scrollTo(0,1);
			//$('body').addClass('device-android');
		};

		/**
		 * Browser specific methods
		 */
		var browser = {};

		/**
		 * Is this app installed on the device?
		 *
		 * @returns {boolean}
		 */
		browser.isStandaloneApp = function()
		{
			return ("standalone" in window.navigator) && window.navigator.standalone;
		};

		/**
		 * Is this browser Mobile Safari?
		 *
		 * @returns {boolean}
		 */
		browser.isMobileSafari = function()
		{
			return navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/)
		};

		/**
		 * App running on Android?
		 *
		 * @returns {boolean}
		 */
		browser.isAndroid = function()
		{
			return navigator.userAgent.match(/Android/i);
		};

		/**
		 * User's properties
		 */
		var storage = {};

		/**
		 * @param key
		 * @param value
		 */
		storage.set = function(key, value)
		{
			window.localStorage.setItem(key, value);
		}

		/**
		 * @param key
		 */
		storage.get = function(key)
		{
			window.localStorage.getItem(key);
		}

		/**
		 * @param key
		 */
		storage.delete = function(key)
		{
			window.localStorage.removeItem(key);
		}

		/**
		 * User's properties
		 */
		var user = {};

		/**
		 * @returns {Q.defer().promise}
		 */
		user.getLocation = function()
		{
			var def = Q.defer();
			var lastPos = user.loadLastLocation();
			if (lastPos) {
				def.resolve(lastPos);
				return def.promise;
			}

			if(navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function(position) {
					var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
					user.saveLocation(pos, 60000);
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
		 * @param expire {number}
		 */
		user.saveLocation = function(pos, expire)
		{
			if (!expire) {
				var expire = 60000; // 1 minute
			}
			storage.set('user-last-location-expire', getTime() + expire);
			storage.set('user-last-location-lat', pos.lat());
			storage.set('user-last-location-lng', pos.lng());
		};

		/**
		 * @returns {*}
		 */
		user.loadLastLocation = function()
		{
			if (!window.localStorage.hasOwnProperty('user-last-location-expire')) {
				return false;
			}
			var expiration = storage.get('user-last-location-expire') * 1;
			if (getTime() > expiration) {
				// cache expired
				user.clearSavedLocation();
				return false;
			}

			return new google.maps.LatLng(
				storage.get('user-last-location-lat'),
				storage.get('user-last-location-lng')
			);
		};

		user.clearSavedLocation = function()
		{
			storage.delete('user-last-location-expire');
			storage.delete('user-last-location-lat');
			storage.delete('user-last-location-lng');
		};

		/**
		 * public command
		 */
		user.showLocation = function()
		{
			Q.fcall(user.getLocation)
				.then(function(pos)
				{
					map.setCenter(pos);
				})
				.fail(defaultErrorHandler)
				.done();
		};

		/**
		 * @returns {google.maps.LatLng}
		 */
		var getDefaultLocation = function()
		{
			return new google.maps.LatLng(47.497912, 19.040235);
		};

		/**
		 * @param userPos {google.maps.LatLng}
		 * @param destinationPos {google.maps.LatLng}
		 * @return {Q.defer().promise} {google.maps.GeocoderResponse}
		 */
		var navigateFromAToB = function(userPos, destinationPos)
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
					def.resolve(response);
				} else {
					def.reject(new Error('Hiba történt az útvonal tervezése közben!'));
				}
			});
			return def.promise;
		};

		var marker = {};

		/**
		 * @param pos {google.maps.LatLng}
		 * @param icon {object}
		 * @param title {string}
		 * @returns {google.maps.Marker}
		 */
		marker.create = function(pos, icon, title)
		{
			return new google.maps.Marker({
				position: pos,
				icon:     icon,
				title:    title
			});
		};

		marker.appIcon = function()
		{
			return new google.maps.MarkerImage(
				'images/trafik-24x24.png',
				new google.maps.Size(24, 24), // (width,height)
				new google.maps.Point(0, 0),  // The origin point (x,y)
				new google.maps.Point(12, 24) // The anchor point (x,y)
			);
		};

		/**
		 * @param markerItem {google.maps.Marker}
		 */
		marker.selfNavigationClick = function(markerItem)
		{
			Q.all([
					user.getLocation(),
					markerItem.getPosition()
				])
				.spread(navigateFromAToB)
				.then(transformNavigationResponse)
				.then(populateDestionationView)
				.done();
		}

		/**
		 * @param locationList    {Array}
		 * @param onClickCallback {function}
		 * @returns {Array}
		 */
		var getLocationMarkers = function(locationList, onClickCallback)
		{
			var markers = [];
			var icon = marker.appIcon();
			$(locationList).each(function(i, data) {
				var pos = new google.maps.LatLng(data[1], data[0]);
				var markerItem = marker.create(pos, icon, 'Trafik ' + i); // TODO fix item name!
				google.maps.event.addListener(markerItem, 'click', function()
				{
					return onClickCallback(markerItem);
				});
				markers.push(markerItem);
			});
			return markers;
		};

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
		};

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
		var populateDestionationView = function(data)
		{
			var des  = $('#destination');
			var divs = des.find('.bottom-line > *');
			var src  = getStreetViewImageUrl(data.destination, 100, 100);

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
		var getStreetViewImageUrl = function(pos, sizeX, sizeY)
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
			var random = Math.floor(Math.random()*locationDataList.length);
			var trafik = locationDataList[random];
			return new google.maps.LatLng(trafik[1], trafik[0]);
		};

		/**
		 * @param mode {google.maps.TravelMode.*}
		 */
		var setTransportMode = function(mode)
		{
			storage.set('user-transport-mode', mode);
			transportMode = mode;
		};

		/**
		 * @returns {google.maps.TravelMode.*}
		 */
		var getTransportMode = function()
		{
			if (window.localStorage.hasOwnProperty('user-transport-mode')) {
				return storage.get('user-transport-mode');
			}
			return google.maps.TravelMode.WALKING;
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
		};

		var activateUI = function()
		{
			$('.settings').click(function(event)
			{
				event.stopPropagation();
				$('#destination, #settings').toggleClass('hidden');
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
						$('#settings').addClass('hidden');
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

		/**
		 * public command
		 */
		var navigateUserToNearestPoint =  function()
		{
			Q.fcall(user.getLocation)
				.then(function(userLocation) {
					var marker = getNearestPoint(userLocation, markers);
					return [
						userLocation,
						marker.getPosition()
					];
				})
				.spread(navigateFromAToB)
				.then(transformNavigationResponse)
				.then(populateDestionationView)
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
		};

		var checkSoftwareUpdate = function()
		{
			var def = Q.defer();
			window.applicationCache.addEventListener('updateready', function(e)
			{
				if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
					window.applicationCache.swapCache();
					if (confirm('Új Trafik frissítések elérhetőek. Újraindúlhat a programot most?')) {
						def.reject();
						window.location.reload();
					}
				}
			}, false);
			def.resolve();
			return def.promise;
		};

		/**
		 * Public methods and vars
		 */
		return {
			author:       '@kisPocok',
			version:      '1.0',
			init:         initByDevice,
			getLocation:  user.getLocation,
			showLocation: user.showLocation,
			showNearest:  navigateUserToNearestPoint
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

/**
 * - All batteries concentrate forward firepower.
 * - Spin up drives two and six!
 * - All hands brace for warp jump on my mark!
 * - Mark!
 */
$(function() {
	trfk.getInstance().init()
});

/**
 * Config for add2home.js
 * @type {{message: string}}
 */
var addToHomeConfig = {
	message: 'Add a kezdőlapodhoz! Trafik kereső alkalmazást az `%icon` ikon megnyomásával telepítheted <strong>%device</strong> készülékedre.'
};
