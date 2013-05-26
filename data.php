<?php

/**
 * KML file amit parsolunk
 */
$localFile    = 'tmp/local-data.xml';
$remoteFile   = 'https://maps.google.hu/maps/ms?ie=UTF8&t=m&source=embed&vpsrc=6&f=d&daddr=Doh%C3%A1nybolt+%4047.513295,19.049402&dg=feature&authuser=0&msa=0&output=kml&msid=209554731696494539199.0004dc43dfb3a8b63d5fe';
$disableCache = true;
$debug        = true;

define('MIN_DISTANCE', 0.05); // minimális távolság 2 bolt között

/**
 * JS fejléc
 */
if (!$debug) {
	header("Content-Type: application/json; charset=utf-8", true);
	error_reporting(0);
}

/**
 * Memcache réteg
 */
include_once('PHPMemcacheSASL/MemcacheSASL.php');
$cache = new MemcacheSASL;
$cache->addServer('mc2.dev.ec2.memcachier.com', '11211');
$cache->setSaslAuthData('0e7527', '95c26e866f8c205e8806');
define('CACHE_DATA',   'trafik-xml-string');
define('CACHE_EXPIRE', 'trafik-expiration-time');

/**
 * Távolság kalkulálása
 *
 * @param flat $lat1
 * @param flat $lng1
 * @param flat $lat2
 * @param flat $lng2
 * @return float
 */
function distance($lat1, $lng1, $lat2, $lng2)
{
	$pi80 = M_PI / 180; // Converts degrees to radians Should be using PHP deg2rad function.

	$lat1 *= $pi80;
	$lng1 *= $pi80;
	$lat2 *= $pi80;
	$lng2 *= $pi80;

	$r = 6372.797; // mean radius of Earth in km
	$dlat = $lat2 - $lat1;//Difference between latitude coordinates
	$dlng = $lng2 - $lng1;//Difference between longitude coordinates
	$a = sin($dlat / 2) * sin($dlat / 2) + cos($lat1) * cos($lat2) * sin($dlng / 2) * sin($dlng / 2);
	$c = 2 * atan2(sqrt($a), sqrt(1 - $a));
	$result = $r * $c;//Distance in km
	return $result;
}

/**
 * @param string $remoteFile
 * @param string $localFile
 * @return bool|string
 */
function loadXml($remoteFile, $localFile)
{
	global $cache;
	try {
		if ($xmlString = file_get_contents($remoteFile)) {
			if ($xmlString === false) {
				$xmlString = file_get_contents($localFile);
				throw new Exception('Remote File Not Found!');
			}
			file_put_contents($localFile, $xmlString);
		}
	} catch(Exception $e) {
		$cache->delete(CACHE_DATA);
		$cache->delete(CACHE_EXPIRE);
	}
	return $xmlString;
}

/**
 * @param string $xmlString (XML)
 * @return array
 */
function pointParser($xmlString)
{
	global $cache;
	$response = array();
	if ($data = new SimpleXMLElement($xmlString)) {
		foreach($data->Document->Placemark as $item) {
			$latLng = explode(",", $item->Point->coordinates);
			if ($latLng[0] === '0.000000' || $latLng[1] === '0.000000') {
				// hibás értékek kiszűrése
				continue;
			}
			$param = array(
				//'name' => (string) $item->name,
				'lat'  => floatval($latLng[0]),
				'lng'  => floatval($latLng[1])
			);

			$tooClose = false;
			foreach ($response as $point) {
				$km = distance(
					$param['lat'], $param['lng'],
					$point['lat'], $point['lng']
				);
				if ($km < MIN_DISTANCE) {
					// közel van az egyik létező ponthoz
					$tooClose = true;
				}
			}
			if (!$tooClose) {
				array_push($response, $param);
			}
		};

		// cache
		$cache->add(CACHE_DATA,   $response);
		$cache->add(CACHE_EXPIRE, time()+3600); // 1 óra
	}
	return $response;
}

/**
 * Üzleti logika
 */
$response = $cache->get(CACHE_DATA);
$expire   = intval($cache->get(CACHE_EXPIRE));
if ($expire <= time()) {
	// lejárt a cache
	$cache->delete(CACHE_DATA);
	$cache->delete(CACHE_EXPIRE);
	$response = false;
}

if ($disableCache || !$response) {
	// reload data and parse
	$xmlString = loadXml($remoteFile, $localFile);
	$response  = pointParser($xmlString);
}

/**
 * Kimenet
 */
echo json_encode($response);
