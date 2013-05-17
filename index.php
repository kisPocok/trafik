<?php
$title       = "Trafik kereső";
$appTitle    = "Trafik";
$description = "Trafik kereső alkalmazás. Megkeresi neked a legközelebbit.";
$url         = "http://" . $_SERVER['HTTP_HOST'];

?><!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8" />
	<title><?=$title; ?></title>
	<meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
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

	<link href="css/bootstrap.min.css" rel="stylesheet">
	<link href="css/add2home.css" rel="stylesheet">
	<link href="css/flat-ui.css" rel="stylesheet">
	<link href="css/app.css" rel="stylesheet">

	<script>
		var addToHomeConfig = {
			animationIn:  'bubble',
			animationOut: 'drop',
			lifespan:     10000,
			expire:       2,
			touchIcon:    true,
			message:      'Add a kezdőlapodhoz! Trafik kereső alkalmazást az `%icon` ikon megnyomásával telepítheted <strong>%device</strong> készülékedre.'
		};
	</script>
	<script src="js/add2home.js"></script>
</head>
<body id="welcome">
<div class="container">
	<h1><?=$appTitle; ?></h1>
	<h2>Megkeresi a legközelebbit.</h2>
	<a href="map.html" class="btn btn-large btn-block">Próbáld ki!</a>
	<div class="phone"></div>
</div>
</body>
</html>