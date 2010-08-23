var map;

// Google Mapsのロード
function loadMap() {
	var latlng = new google.maps.LatLng(34.69214757866803, 133.7817621231079);
	
	var mapOption = {
		zoom: 17,
		center: latlng,
		mapTypeControl: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
	};
	
	
	map = new google.maps.Map(document.getElementById("gmap"),mapOption);
}


// 地図の中心を指定した緯度･経度に移動 (近い距離はスクロール移動)
function goCenter(px,py){
	map.panTo(new google.maps.LatLng(px,py));
}


// 点1から点3までを結ぶ赤線を引く
function addLine(x1,y1,x2,y2,x3,y3){
	var points = new Array();
	points[0] = new google.maps.LatLng(x1,y1);
	points[1] = new google.maps.LatLng(x2,y2);
	points[2] = new google.maps.LatLng(x3,y3);
	
	var option = {
		map: map,
		path: points,
		strokeColor: "#ff0000", //線の色
		strokeWeight: 2, //線の太さ
	};
	var lineObj = new google.maps.Polyline(option);
	lineObj.setMap(map);
	return lineObj;
}


// 赤マーカー(現在位置)を設置
function setCenterMarker(lat,lng){	
	// カスタムマーカー作成
	var centerMarkerObj = new google.maps.Marker();
	//マーカーに画像を利用
	centerMarkerObj.setIcon(new google.maps.MarkerImage("./image/mm_20_red.png") );
	//マーカーの位置を設定
	centerMarkerObj.setPosition(new google.maps.LatLng(lat,lng));
	//地図にマーカーを表示
	centerMarkerObj.setMap(map);
	return centerMarkerObj;
}


function moveMarker(marker, lat,lng){
	marker.setPosition(new google.maps.LatLng(lat,lng));
}


// アルファベット付コンテンツ用マーカーを設置
function setContentMarker(lat, lng, i, num){	
	// カスタムマーカー作成
	var contentMarkerObj = new google.maps.Marker();
	//マーカーに画像を利用
	contentMarkerObj.setIcon(new google.maps.MarkerImage("./image/marker_"+num+".png") );
	//マーカーの位置を設定
	contentMarkerObj.setPosition(new google.maps.LatLng(lat,lng));
	//地図にマーカーを表示
	contentMarkerObj.setMap(map);
	
	// マーカークリック時のアクションを設定
	google.maps.event.addListener(contentMarkerObj, "click", function(){
		map.panTo(contentMarkerObj.getPosition());
		// pasq-core.js側の関数呼び出し
		markerAction(i);
	});
	
	
	return contentMarkerObj;
}

// オブジェクト追加用関数
function addObject(object){
	object.setMap(map);
}

// オブジェクト削除用関数
function removeObject(object){
	object.setMap(null);
}