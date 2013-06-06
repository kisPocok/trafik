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
			visibility.init();

			if (browser.isStandaloneApp()) {
				// telepített alkalmazás, indítás
				initializeApp();
			} else {
				var afterImageLoading = function() {
					$('#install').show();
					if (browser.isMobileSafari() && !browser.isMobileChrome()) {
						// telepíteni kell
						$('#run').remove();
						addToHome.show();
					} else {
						// minden más, gomb után mehet a menet!
						$('#run').click(initializeApp);
					}
				};
				var welcomeImg = new Image();
				welcomeImg.onload  = afterImageLoading;
				welcomeImg.onerror = afterImageLoading;
				welcomeImg.src = 'http://traffik.local/images/welcome-1100x990-compressed.png';
			}
		};

		/**
		 * Standard app start
		 */
		var initializeApp = function()
		{
			$('#install').remove();
			$('#map-canvas, #destination, body > .page').show();

			Q.fcall(checkSoftwareUpdate)
				.then(activateUI)
				.then(locationData.get)
				.then(function(locations)
				{
					var markerParams  = {
						maxZoom:  14,
						gridSize: 45
					};

					if (!locations || locations.length < 1) {
						defaultErrorHandler(new Error('Jelenleg nem elérhető a boltok listája.'));
					}

					if (browser.isAndroid()) {
						initAndroid();
					}

					map           = initializeMap();
					streetView    = initializeStreetView(map);
					markers       = getLocationMarkers(locations, marker.selfNavigationClick);
					markerCluster = new MarkerClusterer(map, markers, markerParams);

					/* TODO handle hiding markers because layout hangs on map
					google.maps.event.addListener(directionsDisplay, 'directions_changed', function() {
						console.log('directions_changed TODO')
					});
					*/
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
			var styleParams = [
				{
					// disable business texts
					featureType: 'poi.business',
					elementType: 'labels',
					stylers: [
						{ visibility: 'off' }
					]
				}
			];
			var params = {
				center:    user.loadLastLocation()||getDefaultLocation(),
				zoom:      16,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				streetViewControl: true,
				styles: styleParams
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
		 */
		var initAndroid = function()
		{
			window.scrollTo(0,1);
			//$('body').addClass('device-android');
		};

		/**
		 * PRE(!) Init iOS specific resources
		 */
		var preInitIOS = function()
		{
			var container = $("#install");
			container.on("touchmove", false);
			if (browser.isMobileSafari()) {
				setTimeout(function() {
					container.find('h2').remove();
					container.find('h1').after($('<h2>Add a kezdőlapodhoz!</h2>'));
				}, 8000);
			}
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
		 * App running on iOS device?
		 *
		 * @returns {boolean}
		 */
		browser.isIOS = function()
		{
			return navigator.userAgent.match(/(iPod|iPhone|iPad)/);
		};

		/**
		 * Is this browser Mobile Safari?
		 *
		 * @returns {boolean}
		 */
		browser.isMobileSafari = function()
		{
			return browser.isIOS() && navigator.userAgent.match(/AppleWebKit/);
		};

		/**
		 * Is this browser Safari?
		 *
		 * @returns {boolean}
		 */
		browser.isSafari = function()
		{
			return navigator.userAgent.indexOf("Safari") > -1;
		};

		/**
		 * Is this browser Mobile Chrome?
		 *
		 * @returns {boolean}
		 */
		browser.isMobileChrome = function()
		{
			return browser.isMobileSafari() && navigator.userAgent.match(/CriOS/);
		}

		/**
		 * Is this browser (desktop) Chrome?
		 *
		 * @returns {boolean}
		 */
		browser.isChrome = function()
		{
			return window.chrome;
		}

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
		 * Page Visibility API
		 */
		var visibility = {};

		/**
		 * Default parameter
		 * @type {string}
		 */
		visibility.browserHiddenParam = "hidden";

		/**
		 * Default Event name
		 * @type {string}
		 */
		visibility.browserChangeEvent = "visibilitychange";

		/**
		 * Execute page visibility api
		 */
		visibility.init = function()
		{
			var d = window.document;
			if (typeof d.mozHidden !== "undefined") {
				visibility.browserHiddenParam = "mozHidden";
				visibility.browserChangeEvent = "mozvisibilitychange";
			} else if (typeof d.msHidden !== "undefined") {
				visibility.browserHiddenParam = "msHidden";
				visibility.browserChangeEvent = "msvisibilitychange";
			} else if (typeof d.webkitHidden !== "undefined") {
				visibility.browserHiddenParam = "webkitHidden";
				visibility.browserChangeEvent = "webkitvisibilitychange";
			}

			// add event for state change handling
			d.addEventListener(visibility.browserChangeEvent, function()
				{
					if (visibility.isVisible()) {
						visibility.enabled();
					} else {
						visibility.disabled();
					}
				}, false
			);
		};

		/**
		 * Is page visible now?
		 *
		 * @returns {boolean}
		 */
		visibility.isVisible = function()
		{
			return !window.document[visibility.browserHiddenParam];
		}

		/**
		 * Add items to execute every on page went visible
		 */
		visibility.enabled = function()
		{
			user.clearSavedLocation();
			$('#install').find('a').show();
		};

		/**
		 * Add items to execute every on page went invisible
		 */
		visibility.disabled = function()
		{
			// do something later...
			$('#install').find('a').addClass('already').hide();
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
			return window.localStorage.setItem(key, value);
		}

		/**
		 * @param key
		 */
		storage.get = function(key)
		{
			return window.localStorage.getItem(key);
		}

		/**
		 * @param key
		 */
		storage.getInt = function(key)
		{
			return storage.get(key) * 1;
		}

		/**
		 * @param key
		 */
		storage.delete = function(key)
		{
			return window.localStorage.removeItem(key);
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
			var params = {
				// see more details at http://diveintohtml5.info/geolocation.html
				timeout:    10000,
				maximumAge: 75000,
				enableHighAccuracy: false
			};
			var lastPos = user.loadLastLocation();
			if (lastPos) {
				def.resolve(lastPos);
				return def.promise;
			}
			if(window.navigator.geolocation) {
				window.navigator.geolocation.getCurrentPosition(function(position)
				{
					var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
					user.saveLocation(pos, 60000);
					def.resolve(pos);
				}, function()
				{
					var er = new Error(getLocationErrorMsgByBrowser());
					def.reject(er);
				}, params);
			} else {
				// Browser doesn't support Geolocation
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
			var expiration = storage.getInt('user-last-location-expire');
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
		 * Center of Budapest
		 *
		 * @returns {google.maps.LatLng}
		 */
		var getDefaultLocation = function()
		{
			return new google.maps.LatLng(47.498381, 19.040426);
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
		 * @param shadow {object}
		 * @param title {string}
		 * @returns {google.maps.Marker}
		 */
		marker.create = function(pos, icon, shadow, title)
		{
			return new google.maps.Marker({
				position: pos,
				icon:     icon,
				shadow:   shadow,
				title:    title
			});
		};

		marker.appIcon = function()
		{
			return new google.maps.MarkerImage(
				'images/marker-32x37.png',
				new google.maps.Size(32, 37), // (width,height)
				new google.maps.Point(0, 0),  // The origin point (x,y)
				new google.maps.Point(16, 37) // The anchor point (x,y)
			);
		};

		marker.shadow = function()
		{
			return {
				url:   'images/marker-shadow-119x119.png',
				size:   new google.maps.Size(119, 119),
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(20, 40)
			};
		}

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
		};

		/**
		 * Location data = Interesting points on map
		 */
		var locationData = {};

		/**
		 * @returns {Q.defer().promise}
		 */
		locationData.get = function()
		{
			var def = Q.defer();
			var data = false;
			var cacheExpired = locationData.isCacheExpired();
			if (cacheExpired) {
				// cache expired, try to reload live data
				locationData.load()
					.then(function(data)
					{
						// data loaded from ajax
						if (!data) {
							// oops, somethings wrong with data, try from cache (even if expired)
							data = locationData.getFromCache();
							def.resolve(data);
						}
						def.resolve(data);
					})
					.fail(function()
					{
						// unable to load live data, try from cache (even if expired)
						data = locationData.getFromCache();
						def.resolve(data);
					});
			} else {
				// cache is OK
				data = locationData.getFromCache();
				def.resolve(data);
			}

			return def.promise;
		};

		/**
		 * @param data {Array}
		 * @returns {Array}
		 */
		locationData.save = function(data)
		{
			var expire = 3600000; // 1 hour
			storage.set('location-data', JSON.stringify(data));
			storage.set('location-data-expire', getTime() + expire);
			return data;
		};

		/**
		 * @returns {boolean}
		 */
		locationData.isCacheExpired = function()
		{
			var expiration = storage.getInt('location-data-expire');
			return (getTime() > expiration);
		};

		/**
		 * @returns {Array}
		 */
		locationData.getFromCache = function()
		{
			var data = storage.get('location-data');
			return JSON.parse(data);
		};

		/**
		 * @returns {Q.defer().promise}
		 */
		locationData.load = function()
		{
			var def = Q.defer();
			var params = {
				method:   'post',
				dataType: 'json'
			};
			$.ajax('data.php', params)
				.done(function(response) {
					if (!response.length) {
						def.reject();
						return;
					}
					locationData.save(response);
					def.resolve(response);
				})
				.fail(function(e) {
					def.reject(e);
				});
			return def.promise;
		};

		/**
		 * @param locationList    {Array}
		 * @param onClickCallback {function}
		 * @returns {Array}
		 */
		var getLocationMarkers = function(locationList, onClickCallback)
		{
			var markers = [];
			var icon    = marker.appIcon();
			var shadow  = marker.shadow();
			$(locationList).each(function(i, data) {
				var pos = new google.maps.LatLng(data.lng, data.lat);
				var markerItem = marker.create(pos, icon, shadow, 'Trafik ' + (i+1)); // TODO fix item name!
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
					var street_number, route, sublocality, locality, bus_station;
					var approximate = locationInfo[0].geometry.location_type === "APPROXIMATE";
					$(locationInfo[0].address_components).each(function(i, item) {
						if ($.inArray('street_number', item.types) > -1) {
							street_number = item.short_name;
						} else if ($.inArray('route', item.types) > -1) {
							route = item.short_name;
						} else if ($.inArray('sublocality', item.types) > -1) {
							sublocality = item.short_name;
						} else if ($.inArray('locality', item.types) > -1) {
							locality = item.short_name;
						} else if ($.inArray('bus_station', item.types) > -1) {
							bus_station = item.short_name;
						}
					});
					if (route && street_number) {
						var title = route + ' ' + street_number + '.';
					} else {
						var title = bus_station;
					}
					if (approximate) {
						title += ' <span class="approximate">körül</span>';
					}
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
			des.find('h1').html(data.address);
			des.find('h2').html(data.address2);
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
		var getRandomPointFromList = function(list)
		{
			var random = Math.floor(Math.random()*list.length);
			var point  = list[random];
			return new google.maps.LatLng(point.lng, point.lat);
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
		var defaultErrorHandler = function(error, callback)
		{
			$('body > .page').hide();
			var errorWidget = $('#error');
			errorWidget.find('h2').text('Hiba történt');
			errorWidget.find('p').html(error.message);
			errorWidget.show();
			errorWidget.removeClass('hidden');
			if (callback) {
				errorWidget.find('.btn').click(callback);
			}
			$('#destination').addClass('hidden');


			if (console && console.error) {
				console.error(error.stack);
			}
		};

		/**
		 * Activate UI
		 */
		var activateUI = function()
		{
			console.log('activateUI')
			$(document).bind('touchmove', false); // disable scrolling

			$('.settings').click(function(event)
			{
				console.log('settings::click')
				event.stopPropagation();
				$('#destination, #settings').toggleClass('hidden');
				return false;
			});

			$('.legal a').click(function(event)
			{
				event.stopPropagation();
				$('#legal').removeClass('hidden');
				return false;
			});

			$('#legal').find('.btn').click(function(event)
			{
				event.stopPropagation();
				$('#legal').addClass('hidden');
				return false;
			});

			$('#error').find('.btn').click(function(event)
			{
				event.stopPropagation();
				$('body > .page').show();
				$('#error').addClass('hidden');
				$('#destination').removeClass('hidden');
				return false;
			});

			$('.radio').click(function(event)
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
				.then(function(pos) {
					var marker = getNearestPoint(pos, markers);
					return [pos, marker.getPosition()];
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
			if (markers.length < 1) {
				return null;
			}
			var nearest = false;
			var min = 10000000;
			$(markers).each(function(i, markerItem)
			{
				var distance = google.maps.geometry.spherical.computeDistanceBetween(pos, markerItem.getPosition());
				if (!isNaN(distance) && distance > 0) {
					min = Math.min(distance, min);
					if (min == distance) {
						nearest = markerItem;
					}
				}
			});
			return nearest;
		};

		var getLocationErrorMsgByBrowser = function()
		{
			var msg = 'Kérlek, engedélyezd a lokációd megosztását az alkalmazással! Enélkül nem tud az alkalmazás a térképen megtalálni a pontos helyzeted.';
			/*
			if (browser.isChrome() || browser.isMobileChrome()) {
				msg += '</p><h2>Engedélyezése</h2><p>Beállítások &gt; Személyes adatok &gt; Tartalom beállítása &gt; Helymeghatározás';
			} else if (browser.isMobileSafari() || browser.isStandaloneApp()) {
				msg += '</p><h2>Engedélyezése</h2><p>Kezdőlap > Beállítások &gt; Álltalános beállítások&nbsp;&gt; Törlés &gt; Lokáció törlése';
			} else if (browser.isSafari) {
				msg += '</p><h2>Engedélyezése</h2><p>Beállítások &gt; Adatvédelem &gt; Lokáció';
			}
			*/
			return msg;

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
			initApp:      initializeApp,
			preInitIOS:   preInitIOS,
			getLocation:  user.getLocation,
			showLocation: user.showLocation,
			showNearest:  navigateUserToNearestPoint,
			browser:      browser,
			visibility:   visibility
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
 * - [..]
 * - Mark!
 */
$(function() {
	var app = trfk.getInstance();
	if (app.browser.isIOS()) {
		app.preInitIOS();
	}
	app.init();
});

/**
 * Config for add2home.js
 * @type {{message: string}}
 */
var addToHomeConfig = {
	message: 'Add a kezdőlapodhoz! Trafik kereső alkalmazást a(z) `%icon` ikon megnyomásával telepítheted <strong>%device</strong> készülékedre.',
	lifespan: 200000,
	expire:   0
};
