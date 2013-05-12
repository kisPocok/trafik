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
				center:    loadUserLastLocation() || getDefaultLocation(),
				zoom:      16,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			return new google.maps.Map(container, params);
		};

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
					def.resolve(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
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
		 * @param map {google.maps.Map}
		 * @param pos {google.maps.LatLng}
		 */
		var showUserLocation = function(map, pos)
		{
			var infowindow = new google.maps.InfoWindow({
				map: map,
				position: pos,
				content: 'Location found using HTML5.'
			});
			map.setCenter(pos);
		};

		/**
		 * @param pos {google.maps.LatLng}
		 */
		var saveUserLastLocation = function(pos)
		{
			window.localStorage.setItem('user-last-location-time', getTime());
			window.localStorage.setItem('user-last-location-kb', pos.kb);
			window.localStorage.setItem('user-last-location-lb', pos.lb);
		}

		/**
		 * @returns {number}
		 */
		var getTime = function()
		{
			return (new Date()).getTime();
		}

		/**
		 * @returns {*}
		 */
		var loadUserLastLocation = function()
		{
			if (!window.localStorage.hasOwnProperty('user-last-location-time')) {
				return false;
			}
			var maxDelay = 600000; // 10 min
			var lastTime = window.localStorage.getItem('user-last-location-time') * 1;
			var diff = getTime() - lastTime;
			if (diff > maxDelay) {
				// elévült tartózkodási hely
				return false;
			}

			return new google.maps.LatLng(
				window.localStorage.getItem('user-last-location-kb'),
				window.localStorage.getItem('user-last-location-lb')
			);
		}

		/**
		 * @returns {google.maps.LatLng}
		 */
		var getDefaultLocation = function()
		{
			return new google.maps.LatLng(47.514476, 19.057074);
		}

		var handleNoGeolocation = function(errorFlag) {
			if (errorFlag) {
				var content = 'Error: The Geolocation service failed.';
			} else {
				var content = 'Error: Your browser doesn\'t support geolocation.';
			}

			var options = {
				map: map,
				position: new google.maps.LatLng(60, 105),
				content: content
			};

			var infowindow = new google.maps.InfoWindow(options);
			map.setCenter(options.position);
		};

		/**
		 * INIT CODE
		 */
		console.log('traffik::init');
		var map;
		Q.fcall(function() {
				map = initializeMap()
			})
			.then(getUserLocation)
			.then(function(pos) {
				saveUserLastLocation(pos);
				showUserLocation(map, pos);
			}, function (error) {
				console.error('Hiba történt!', error.message);
			})
			.done();

		return {
			initMap:      initializeMap,
			getLocation:  getUserLocation,
			showLocation: function()
			{
				Q.fcall(getUserLocation)
					.then(function(pos) {
						saveUserLastLocation(pos);
						showUserLocation(map, pos);
					}, function (error) {
						console.error('Hiba történt!', error.message);
					})
					.done();
			},
			debug: {
				map:    map
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