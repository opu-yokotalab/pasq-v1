var map;

// Google Mapsのロード
function loadMap() {
	map = new GMap2(document.getElementById("gmap"));
	// 初期座標
	map.setCenter(new GLatLng(34.69214757866803, 133.7817621231079), 17);
	// 地図操作用オブジェクト
	map.addControl(new GSmallMapControl());
	// 初期倍率 (外部から与えられる最大値？ 地図側からはさらに拡大可能)
	//map.setZoom(17);
}


// 地図の中心を指定した緯度･経度に移動 (近い距離はスクロール移動)
function goCenter(px,py){
	map.panTo(new GLatLng(px,py));
}


// 点1から点3までを結ぶ赤線を引く
function addLine(x1,y1,x2,y2,x3,y3) {
	// 座標配列
	var points = [new GLatLng(x1,y1),new GLatLng(x2,y2),new GLatLng(x3,y3)];
	var lineObj = new GPolyline(points, "#ff0000",2,1);
	map.addOverlay(lineObj);
	return lineObj;
}


// 赤マーカー(現在位置)を設置
function setCenterMarker(px,py){
	// カスタムマーカー作成
	var centerMarkerObj = new GIcon();
	// マーカー画像指定
	centerMarkerObj.image = "./image/mm_20_red.png";
	// 画像サイズ指定
	centerMarkerObj.iconSize = new GSize(12,20);
	// 中心座標(画像上で緯度・経度を指し示す位置)を指定
	centerMarkerObj.iconAnchor = new GPoint(6,20);
	var marker = new GMarker(new GLatLng(px,py),centerMarkerObj);
	map.addOverlay(marker);
	return marker;
}

// 緑マーカー(パノラマ位置)を設置 (現在未使用)
function setPanoMarker(py,px){
	var panoMarkerObj = new GIcon();
	panoMarkerObj.image = "./image/mm_20_green.png";
	panoMarkerObj.iconSize = new GSize(12,20);
	panoMarkerObj.iconAnchor = new GPoint(6,20);
	var marker = new GMarker(new GLatLng(py,px),panoMarkerObj);
	map.addOverlay(marker);
	return marker;
}

// アルファベット付コンテンツ用マーカーを設置
function setContentMarker(px, py, i, num){
	var contentMarkerObj = new GIcon();
	contentMarkerObj.image = "./image/marker_" + num + ".png";
	contentMarkerObj.iconSize = new GSize(20, 34);
	contentMarkerObj.iconAnchor = new GPoint(10, 34);
	var marker = new GMarker(new GLatLng(px, py), contentMarkerObj);
	marker.title = i;
	map.addOverlay(marker);

	// マーカークリック時のアクションを設定
	GEvent.addListener(marker, "click", function(){
		map.panTo(marker.getPoint());
		// pasq-core.js側の関数呼び出し
		parent.markerAction(marker.title);
	});
}


// オブジェクト追加用関数
function addObject(object){
	map.addOverlay(object);
}


// オブジェクト削除用関数
function removeObject(object){
	map.removeOverlay(object);
}