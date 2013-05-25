<?php

/**
 * KML file amit parsolunk
 */
$localFile    = 'tmp/local-data.xml';
$remoteFile   = 'https://maps.google.hu/maps/ms?ie=UTF8&t=m&source=embed&vpsrc=6&f=d&daddr=Doh%C3%A1nybolt+%4047.513295,19.049402&authuser=0&msa=0&output=kml&msid=209554731696494539199.0004dc43dfb3a8b63d5fe';
$disableCache = false;
$debug        = false;

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
$m = new MemcacheSASL;
$m->addServer('mc2.dev.ec2.memcachier.com', '11211');
$m->setSaslAuthData('0e7527', '95c26e866f8c205e8806');
define('CACHE_DATA',   'trafik-xml-string');
define('CACHE_EXPIRE', 'trafik-expiration-time');

/**
 * Üzleti logika
 */
$response = array();
$expire   = intval($m->get(CACHE_EXPIRE));
if ($expire <= time()) {
	$m->delete(CACHE_DATA);
	$m->delete(CACHE_EXPIRE);
}

$xmlString = $m->get(CACHE_DATA);
if ($disableCache || !$xmlString) {
	try {
		if ($xmlString = file_get_contents($remoteFile)) {
			if ($xmlString === false) {
				$xmlString = file_get_contents($localFile);
				throw new Exception('Remote File Not Found!');
			}
			$m->add(CACHE_DATA, $xmlString);
			$m->add(CACHE_EXPIRE, time()+3600); // 1 óra
			file_put_contents($localFile, $xmlString);
		}
	} catch(Exception $e) {
		$m->delete(CACHE_DATA);
		$m->delete(CACHE_EXPIRE);
	}
}

/**
 * Kimenet
 */
if ($data = new SimpleXMLElement($xmlString)) {
	foreach($data->Document->Placemark as $key=>$item) {
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
		array_push($response, $param);
	};
}
echo json_encode($response);
