<?php

$title       = "Trafik kereső";
$appTitle    = "Trafik";
$description = "Trafik kereső alkalmazás. Megkeresi neked a legközelebbit.";
$add2home    = "Add a kezdőlapodhoz! Trafik kereső alkalmazást az `%icon` ikon megnyomásával telepítheted <strong>%device</strong> készülékedre.";
$url         = "http://" . $_SERVER['HTTP_HOST'];

$autoRun     = isset($_GET['autorun']) && intval($_GET['autorun']) === 1;

?><!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8" />
	<title><?=$title; ?></title>
	<meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black">
	<meta name="apple-mobile-web-app-title" content="<?=$title; ?>">

	<meta name="robots" content="index, nofollow" />
	<meta name="description" content="<?=$description; ?>" />
	<meta property="og:title" content="<?=$title; ?>" />
	<meta property="og:description" content="<?=$description; ?>" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="<?=$url; ?>" />
	<meta property="og:locale" content="hu_HU" />
	<meta property="og:site_name" content="<?=$appTitle; ?>" />
	<meta property="og:image" content="<?=$url; ?>/images/welcome-1100x990.png" />

	<link rel="shortcut icon" href="images/favicon.png" />
	<link rel="apple-touch-icon" href="apple-touch-icon-57x57-precomposed.png" />
	<link rel="apple-touch-icon" sizes="72x72" href="apple-touch-icon-72x72-precomposed.png" />
	<link rel="apple-touch-icon" sizes="114x114" href="apple-touch-icon-114x114-precomposed.png" />
	<link rel="apple-touch-icon" sizes="144x144" href="apple-touch-icon-144x144-precomposed.png" />
	<link rel="canonical" href="<?=$url; ?>" />

	<link rel="stylesheet" href="css/bootstrap.min.css">
	<link rel="stylesheet" href="css/add2home.css">
	<link rel="stylesheet" href="css/flat-ui.css">
	<link rel="stylesheet" href="css/app.css">
</head>
<body>

<!-- Installer layout -->
<div id="install">
	<h1><?=$appTitle; ?></h1>
	<h2>Megkeresi a legközelebbit.</h2>
	<a id="run" href="#" class="btn btn-large btn-block">Próbáld ki!</a>
	<div class="phone"></div>
</div>

<!-- Google map container -->
<div id="map-canvas" style="display:none;"></div>

<!-- User Interface -->
<div id="destination" style="display:none;">
	<div class="top-line">
		<div><!-- photo goes here --></div>
		<div>
			<h1>Közeli trafik keresése</h1>
			<h2></h2>
		</div>
	</div>
	<div class="bottom-line">
		<span class="fui-location-16"></span>
		<span class="fui-time-16"></span>
		<a href="#" class="settings fui-menu-16">Beállítások</a>
	</div>
</div>

<!-- Settings page -->
<div id="settings" class="page hidden" style="display:none;">
	<div>
		<h2>Útvonaltervezés módja</h2>
		<label class="radio">
			<input type="radio" name="travelMode" value="WALKING"> Gyalog
		</label>
		<label class="radio">
			<input type="radio" name="travelMode" value="TRANSIT"> Tömegközlekedéssel
		</label>
		<label class="radio">
			<input type="radio" name="travelMode" value="DRIVING"> Autóval
		</label>
		<p class="legal"><a href="#">Felhasználási feltételek</a></p>
		<a href="#"class="settings btn btn-large btn-block btn-success">Bezárás</a>
	</div>
</div>

<!-- Term of Use page -->
<div id="legal" class="page hidden" style="display:none;">
	<div>
		<h2>Felhasználási feltételek</h2>
		<p>Szeretném, hogy tudd, mert fontos. A térképet a <a href="https://developers.google.com/maps/documentation/" target="_blank">Google Maps</a> szolgáltatja. Előfordulhat, hogy a felület néhol kitakarja a logóját, ez nem szándékos.</p>
		<p>Anoním statisztikai adatot gyűjtök az alkalmazás használatáról. Nem kell aggódnod emiatt, <b>nem rögzít semmilyen személyes adatot</b>.</p>
		<p>Vasárnaponként a kandalló melegében reménykedek, sikerült jobbá tennem a világot.</p>
		<p>Twitter: <a href="http://twitter.com/kisPocok" target="_blank">@kisPocok</a></p>
		<p>Blog: <a href="http://kispocok.blog.hu?ref=trafik" target="_blank">kispocok.blog.hu</a></p>
		<a href="#" class="btn btn-large btn-block btn-success">Bezárás</a>
	</div>
</div>

<script src="http://maps.googleapis.com/maps/api/js?key=AIzaSyBTYqceLuszLWf1_yF9CExEitMtvkZQIzE&sensor=true&language=hu&libraries=geometry"></script>
<script src="js/google.maps.marker-cluster.js"></script>
<script src="js/jquery-1.9.1.min.js"></script>
<script src="js/q.min.js"></script>
<script src="js/flat-ui.inputs.js"></script>
<script src="js/app.js"></script>
<script>var addToHomeConfig = { autostart:false, message:'<?=$add2home; ?>'};</script>
<script src="js/add2home.js"></script>
<?php if($autoRun): ?>
<script>/*AutoRun:ON*/trfk.getInstance().initApp();</script>
<?php endif; ?>
<script>
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-41202408-1', 'herokuapp.com');
ga('send', 'pageview');
</script>
</body>
</html>