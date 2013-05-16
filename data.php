<?php

/**
 * KML file amit parsolunk
 */
$remoteFile = 'https://maps.google.hu/maps/ms?ie=UTF8&t=m&source=embed&vpsrc=6&f=d&daddr=Doh%C3%A1nybolt+%4047.513295,19.049402&authuser=0&msa=0&output=kml&msid=209554731696494539199.0004dc43dfb3a8b63d5fe';

/**
 * JS fejléc
 */
header("Content-Type: text/javascript; charset=utf-8");

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
$expire = intval($m->get(CACHE_EXPIRE));
if ($expire <= time()) {
	$m->delete(CACHE_DATA);
	$m->delete(CACHE_EXPIRE);
}

$xmlString = $m->get(CACHE_DATA);
if (!$xmlString) {
	try {
		if ($xmlString = file_get_contents($remoteFile)) {
			$m->add(CACHE_DATA, $xmlString);
			$m->add(CACHE_EXPIRE, time()+3600); // 1 óra
		}
	} catch(Exception $e) {
		$m->delete(CACHE_DATA);
		$m->delete(CACHE_EXPIRE);
		header('Location: ' . $remoteFile);
		exit();
	}
}

/**
 * Kimenet
 */
$data = new SimpleXMLElement($xmlString);
echo "var locationDataList = [\n";
foreach($data->Document->Placemark as $key=>$item) {
	$latLng = str_replace(',0.000000', '', $item->Point->coordinates);
	echo "[", $latLng, "],\n";
};
echo "];\n";