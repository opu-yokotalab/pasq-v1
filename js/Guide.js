// ================================================================
// setting
/*
var basePath = "./resource/";
var contentBasePath = "./content/";

var metaFileName = "meta.xml";
var appletPath = "PTViewer.jar";
var appletClass = "ptviewer.class";
var appletWidth = "900";
var appletHeight = "360";
var appletId = "ptviewer";
var appletName = "ptviewer";
var appletMayscript = "true";

var bmdFileName = "";
var pcdFileName = "";
var ccdFileName = "";

var meta = new JKL.ParseXML(basePath + metaFileName);;
var bmd;
var pcd;
var ccd;

var metaData;

var BMDobj = {}; //JSON形式
var PCDobj = {}; //パノラマデータ格納オブジェクト JSON形式
var CCDobj = {};
var appPTV = {}; //document.ptviewer

var isBMDloaded = false;
var isPCDloaded = false;
var isCCDloaded = false;

//現在の状態を保持する
var nowStat = {};
nowStat.panoid = "";
nowStat.offsetNorth = "";
nowStat.arLink = [];

var firstfov = 105;
var firstpan = 0;

//////////
// panoidからPanorama配列の添え字を逆引するための配列
var number = new Array();

var contentmarker = new Array();
// var panomarker = new Array();
var centerMarker;

var lineObj;
// 視野角更新時の値保持用
var tmp_ua = 370;
var tmp_f = 105;

// 前進動作継続用フラグ
var flag_click = false;
//////////
*/
//-------------------変更部分　part　始-----------------------------
//-------------------変更部分　part　終-----------------------------
//-------------------追加部分　part　始-----------------------------
//-------------------追加部分　part　終-----------------------------

//-------------------追加部分　part1　始-----------------------------

var Guide;
var GuideFileName = "Guide.xml";
var Guideobj = {};
var pano;
var pano2;
var preAngle=0;
var i2=0;//GUIDE.rute..point[i]に使う
var nowlng=0;
var nextlng=0;
var nowlat=0;
var nextlat=0;
var GuideData;
var flag_find=false;
var flag_Angle=false;
var flag_routepano = false;
//-------------------追加部分　part1　終----------------------



// ================================================================
// start


//-------------------追加部分　part2　始-----------------------------
function onloadMeta2(){
	flag_guide = true;
	i2 = 0;
	nowlng=0;
	nextlng=0;
	nowlat=0;
	nextlat=0;
	Guide = new JKL.ParseXML(basePath + GuideFileName);
	var func = function(data){
		onloadGuide(data);
	}
	Guide.async(func);
	Guide.parse();
}

function onloadGuide(data){
	Guideobj = data.Guide;
	setGuide();
}

function setGuide(){
	pano = Guideobj.route.startpanoid;
	//startpanoidの緯度経度を読み込んでくる
	nextlng = PCDobj.Panoramas.Panorama[number[pano]].coords.lng;
	nextlat = PCDobj.Panoramas.Panorama[number[pano]].coords.lat;
	startGuide()
}
//-------------------追加部分　part2　終-----------------------------
//////////

/**
 * appletタグにparamタグを付加
 * @param aptag -AppletタグのElement
 *
 */

function makeParamTag(aptag){
	// PCDファイルからの初期方位の暫定値
	if(PCDobj.Panoramas.startdir) firstpan = parseInt(PCDobj.Panoramas.startdir);
	else firstpan = 0;

	// アドレスパラメータからの初期パノラマ・初期方位を設定
	if(window.location.search){
		var str = window.location.search;

		// 初期パノラマの指定のみ
		if(str.indexOf("&") == -1){
			PCDobj.Panoramas.startpano = str.substring(str.indexOf("id=") + 3);
		}

		// 初期パノラマ・初期方位の両方を指定
		else{
			PCDobj.Panoramas.startpano = str.substring(str.indexOf("id=") + 3, str.indexOf("&"));
			firstpan = parseInt(str.substring(str.indexOf("dir=") + 4));
		}
	}

	// 初期方位をPTViewerに渡すためのパン角に変換
	firstpan = (calcNorthOffset(PCDobj.Panoramas.startpano) + firstpan) % 360;
	if(firstpan > 180) firstpan -= 360;

	// スタートパノの登録
	var paramtag = makeParamTagElement("file", basePath + PCDobj.Panoramas.Panorama[number[PCDobj.Panoramas.startpano]].img.src);
	aptag.appendChild(paramtag);
	paramtag = makeParamTagElement("getview", "getview");
	aptag.appendChild(paramtag);
	paramtag = makeParamTagElement("pan", firstpan);
	aptag.appendChild(paramtag);

	// hotspotの動的追加 (現在、起動時のみなぜか動作せず)
	var hsList = calcHS(PCDobj.Panoramas.startpano);
	if(hsList.length){
		for(var i = 0; i < hsList.length; i++){
			paramtag = makeParamTagElement("hotspot" + i, hsList[i]);
			aptag.appendChild(paramtag);
		}
	}
}

//////////////////////////////////////////////////

/**
 * @param name -name属性の値のストリング eg. panoN
 * @param value -value属性の値のストリング eg. {getview=getview}
 * @return paramtag -paramタグのエレメント
 */

function makeParamTagElement(name, value){
	var paramtag = document.createElement("param");
	paramtag.setAttribute("name", name);
	paramtag.setAttribute("value", value);
	return paramtag;
}


// BMD，PCD の準備が出来ていたら計算開始
function checkAllReady(){
	if(isBMDloaded && isPCDloaded){

		opuMap();

		startCalculate();
	}
}

function startCalculate(){
/*
	//マップにパノラマの位置を設定
	for(var i=0; i<PCDobj.Panoramas.Panorama.length; i++){
		panomarker[i] = setPanoMarker(PCDobj.Panoramas.Panorama[i].coords.lng, PCDobj.Panoramas.Panorama[i].coords.lat);
	}
*/

	// マップにコンテンツを設定 (ある場合のみ)
	if(isCCDloaded){
		var html = '<form name="content"><a href="javascript:contentIchiran();">コンテンツを一覧表示</a><br />'
			 + '<select name="contentlist" size="10"></select><br />'
			 + '<input type="button" value="コンテンツの近くへ移動" onclick="gotoContent(-1)" /></form>';
		document.getElementById("area_content").innerHTML = html;

		var alphabet = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
		for(var i=0; i<CCDobj.Contents.Content.length; i++){
			var cx = CCDobj.Contents.Content[i].coords.lng;
			var cy = CCDobj.Contents.Content[i].coords.lat;
			contentmarker[i] = setContentMarker(cx, cy, i, i % 26);

			// FireFoxでエラー (Optionコンストラクタが動作しない？)
			content.contentlist.options[i] = new Option(alphabet[i % 26] + ". " + CCDobj.Contents.Content[i].detail.name);
		}
	}

	//マップに初期パノラマを設定
	var tmp_lng = PCDobj.Panoramas.Panorama[number[PCDobj.Panoramas.startpano]].coords.lng;
	var tmp_lat = PCDobj.Panoramas.Panorama[number[PCDobj.Panoramas.startpano]].coords.lat;
	// マーカー設置
	centerMarker = setCenterMarker(tmp_lng, tmp_lat);
	// 視野角の表示は後回し(ここでは設定せず)
	lineObj = addLine(tmp_lng, tmp_lat, tmp_lng, tmp_lat, tmp_lng, tmp_lat);
	// 初期位置に移動
	goCenter(tmp_lng, tmp_lat);

	calcNowStat(PCDobj.Panoramas.startpano);
}

/**
 * 引数の panoid からの状態を計算する
 * @param panoid
 *
 */

function calcNowStat(panoid){
	nowStat.panoid = panoid;
	nowStat.offsetNorth = calcNorthOffset(panoid);

	//角度とパノラマの対応を計算
	nowStat.arLink = calcStatArLink();

}

function calcNorthOffset(panoid){
	//calculate offset for north
	var pw = PCDobj.Panoramas.Panorama[number[panoid]].img.width;
	var nw = PCDobj.Panoramas.Panorama[number[panoid]].direction.north;
	var northdir = nw/pw*360-180;
	return northdir;
}

function calcStatArLink(){
	var arLink = new Array(360);
	var num = number[nowStat.panoid];

	// 近傍パノラマが1つのみの場合は配列として再構成
	if(!PCDobj.Panoramas.Panorama[num].chpanos.chpano.length){
		var tmpObj = PCDobj.Panoramas.Panorama[num].chpanos.chpano;
		PCDobj.Panoramas.Panorama[num].chpanos.chpano = new Array();
		PCDobj.Panoramas.Panorama[num].chpanos.chpano[0] = tmpObj;
	}

	for(var i = 0; i < PCDobj.Panoramas.Panorama[num].chpanos.chpano.length; i++){
		var sd = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.start);
		var ed = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.end);
		if(sd > ed){ // 0度をまたぐとき
			for(var j=sd; j<=359; j++){
				arLink[j] = PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid;
			}
			for(var j=0; j<=ed; j++){
				arLink[j] = PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid;
			}
		}else{
			for(var j=sd; j<=ed; j++){
				arLink[j] = PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid;
			}
		}
	}

	return arLink;
}



function changePano2(panoid,p,t,f){

	var p = (p)? p: 0;
	var t = (t)? t: 0;
	var f = (f)? f: 105;


	calcNowStat(panoid);
	//calculate offset for north
	var northdir = calcNorthOffset(panoid);

	var num = number[panoid];

	// PTViewerに渡すパノラマ指定用データ作成
	var str = "param name=" + panoid + " value=";
	str += "{getview=getview}";
	str += "{file="+ basePath + PCDobj.Panoramas.Panorama[num].img.src +"}";

	// hotspotの動的追加
	var hsList = calcHS(panoid);
	if(hsList.length){
		for(var i = 0; i < hsList.length; i++) str += "{hotspot" + i + "=" + hsList[i] + "}";
	}

	//-------------------変更部分　part2　始-----------------------------
/*	for(var i = 0; i < PCDobj.Panoramas.Panorama[num].chpanos.chpano.length; i++){
		//近傍情報に目的パノがあったらそっちを向くように
		if(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid==pano){
			flag_find = true;
			var sd = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.start);
			var ed = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.end);
			//0度をまたぐ時
			if(sd > ed){
				Angle = sd+ (360 - sd + ed)/2;//sdとedの中間の角度をとる。
				break;
			}
			else{
				Angle = (sd+ed) /2;
				break;
			}
		}
	}
	*/
//近傍情報に目的のパノが見つからなかったときのみ、すすむ先にパノラマがあるかないか判定するように”｝”の位置を10/21修正部分を含むようにな位置にずらした
	if(flag_find==false){
		nowlat = PCDobj.Panoramas.Panorama[number[nowStat.panoid]].coords.lat;
		nowlng = PCDobj.Panoramas.Panorama[number[nowStat.panoid]].coords.lng;
		Angle = Math.atan2((nextlng-nowlng),(nextlat-nowlat))*180/Math.PI;//X,Y座標の角度を得る.ラジアンなので180/πをかけてやって-180~180度の角度にする。
	//	Angle = parseInt((calcNorthOffset(pano2) + Angle) % 360);


	//-----------------------10/21修正部分。パノラマがない角度にすすまないように--始----------------
		for(var i = 0; i < PCDobj.Panoramas.Panorama[num].chpanos.chpano.length; i++){
			var sd = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.start);
			var ed = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.end);
			if(sd<ed){//0度をまたいでいない時
				if(Angle-sd>=0&&ed-Angle>=0){//これを満たせばAngleがsd,edの間にある
					flag_Angle = true;//移動できるパノラマがあるっていう判定
				}
			}
			else{//0度をまたぐ時はsdを0度にして、他をそれに合わせる。
				var x = 0;
				var y = ed + 360 - sd;
				var z = Angle + 360 - sd;
				if(z-x>=0&&y-z>=0){
					flag_Angle = true;
					}
				}
			}
		if(flag_Angle == false){
			var x = 360;
			for(var i = 0; i < PCDobj.Panoramas.Panorama[num].chpanos.chpano.length; i++){
				var sd = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.start);
				var ed = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.end);
				if(Math.abs(sd-parseInt(Angle))<x){
					x = sd;
				}
				if(Math.abs(ed-parseInt(Angle))<x){
					x = ed;
				}
			}
		Angle = x;
		}
	}
	flag_find = false;
	flag_Angle = false;
	//-----------------------10/21修正部分。パノラマがない角度にすすまないように--終---------------
	Angle = (calcNorthOffset(panoid) + Angle) % 360;

	//--------------------経路データに載っているパノラマに切り替わった時は緩やかに角度変更
	if(pano!=nowStat.panoid){//次に変更するパノラマと今の目的パノラマが一致しなかった場合。
		if(flag_routepano==true){
			appPTV.newPano(str, preAngle, t, f);
			tmp_ua = 370;
			removeObject(centerMarker);
			centerMarker = setCenterMarker(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat);
			goCenter(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat);
			angleOfView(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat, preAngle, f);
			if(Math.abs(Angle-p)<15){//Angleとpの差がほぼ無い場合はすぐに直進させる。
				appPTV.gotoView(Angle, t, f)
				appPTV.startAutoPan( 0.0, 0.0, 1.0/1.025 );
				flag_routepano = false;
			}
		//元の角度から次の目的地に向かって角度を変換させる。
/*
		 * 1.右回りで0度をまたがない
		 * 2.左回りで0度をまたがない
		 * 3.右回りで0度をまたぐ
		 * 4.左回りで0度をまたぐ
		 * とする
		 * */
			if((Angle<0 && preAngle<0) || (Angle>0 && preAngle>0)){  //1.2に該当する。0度をまたがない
				if(Angle>preAngle){  //1に該当する。
				//	alert("1");
					appPTV.startAutoPan( 2.0, 0.0, 1.0 );
				}
				else{  //2に該当する
				//	alert("2");
					appPTV.startAutoPan( -2.0, 0.0, 1.0 );
				}
			}
			else{//3.4に該当する。0度をまたぐ
				if(Angle>0){  //3に該当する
				//	alert("3");
					appPTV.startAutoPan( 2.0, 0.0, 1.0 );
					}
				else{  //4に該当する
				//	alert("4");
					appPTV.startAutoPan( -2.0, 0.0, 1.0 );
				}
			}
		}
		else{
			appPTV.newPano(str, Angle, t, f);
			preAngle = Angle;

			//-------------------変更部分　part2　終-----------------------------
			tmp_ua = 370;
			removeObject(centerMarker);
			centerMarker = setCenterMarker(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat);
			goCenter(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat);

			//-------------------変更部分　part3　始-----------------------------
			angleOfView(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat, Angle, f);
			//alert("普通の切り替え" + preAngle);
			//-------------------変更部分　part3　終-----------------------------
		}
	}
	//-------------------変更部分　part1　始-----------------------------

	if(pano==nowStat.panoid){
		appPTV.stopAutoPan();
		getAngle();
	}
	else{
		if(flag_routepano == false)appPTV.startAutoPan( 0.0, 0.0, 1.0/1.025 );
	}
	//-------------------変更部分　part1　終-----------------------------
}
//-------------------追加部分　part3　始-----------------------------

function startGuide(){
	// 初期位置に移動
	i2=0;
	preAngle=0;
	//goCenter(nextlng, nextlat);
	//changePano(pano,0,0,105);
	// マーカー設置
	//centerMarker = setCenterMarker(nextlng, nextlat);

	getAngle();
}

//進む角度を求める関数　緯度lat経度lng　次の緯度nextlat次の緯度nextlng
function getAngle(){

	if(i2<Guideobj.route.point.length){
		pano2 = pano;//pano2は今いる(出発地点)
		pano = Guideobj.route.point[i2].panoid;//panoは次に向かう目的地
		i2++;
		nowlat = nextlat;
		nowlng = nextlng;
		nextlat = PCDobj.Panoramas.Panorama[number[pano]].coords.lat;
		nextlng = PCDobj.Panoramas.Panorama[number[pano]].coords.lng;
		if(i2!=1){
			flag_routepano = true;
			changePano2(pano2,Angle,0,105);
		}
		else{
			Angle = Math.atan2((nextlng-nowlng),(nextlat-nowlat))*180/Math.PI;//X,Y座標の角度を得る.ラジアンなので180/πをかけてやって-180~180度の角度にする。
			Angle = (calcNorthOffset(pano2) + Angle) % 360;
			changePano2(pano2,Angle,0,105);
		}
	}
	else{
		appPTV.stopAutoPan();
		flag_guide = false;
	}
}
//-------------------追加部分　part3　終-----------------------------


function calcHS(panoid){
	var hsList = new Array();
	var num = number[panoid];
	// PCDにhotspotの記述がある場合
	if(PCDobj.Panoramas.Panorama[num].hotspots && PCDobj.Panoramas.Panorama[num].hotspots.hotspot){
		if(PCDobj.Panoramas.Panorama[num].hotspots.hotspot.length){
			for(var i = 0; i < PCDobj.Panoramas.Panorama[num].hotspots.hotspot.length; i++){
				hsList[hsList.length] = PCDobj.Panoramas.Panorama[num].hotspots.hotspot[i];
			}
		}
		else{
			hsList[hsList.length] = PCDobj.Panoramas.Panorama[num].hotspots.hotspot;
		}
	}

	// コンテンツの有効範囲からhotspotの作成
	if(isCCDloaded){
		var lng1 = parseFloat(PCDobj.Panoramas.Panorama[num].coords.lng) * Math.PI / 180;
		var lat1 = parseFloat(PCDobj.Panoramas.Panorama[num].coords.lat) * Math.PI / 180;
		for(var i=0;i<CCDobj.Contents.Content.length;i++){
			var lng2 = parseFloat(CCDobj.Contents.Content[i].coords.lng) * Math.PI / 180;
			var lat2 = parseFloat(CCDobj.Contents.Content[i].coords.lat) * Math.PI / 180;
			var dx = 6378137 * (lng2 - lng1) * Math.cos(lat1);
			var dy = 6378137 * (lat2 - lat1);
			var dist = Math.sqrt(dx * dx + dy * dy);
			if(CCDobj.Contents.Content[i].range && (dist <= parseFloat(CCDobj.Contents.Content[i].range.radius))){
				var dir = Math.atan2(dx, dy);
				dir = dir * 180 / Math.PI;
				dir = (360 + dir) % 360;

				var flag_content = false;
				var tmp_dir = (360 + dir + 180) % 360;
				var sd = parseFloat(CCDobj.Contents.Content[i].range.angle_s);
				var ed = parseFloat(CCDobj.Contents.Content[i].range.angle_e);
				if(ed < sd){ // 有効範囲が0°をまたぐ場合
					if((tmp_dir >= sd) || (tmp_dir <= ed)) flag_content = true;
				}
				else{
					if((tmp_dir >= sd) && (tmp_dir <= ed)) flag_content = true;
				}

				// コンテンツの有効範囲内であればhotspotの作成
				// 現在はコンテンツへの方位から推測した位置にコンテンツ名称の表示
				// コンテンツに高さ情報があれば、パノラマ画像の高さ(現在1.5m固定)と比較し縦方向の位置も推測(なければ画像中央)
				if(flag_content){
					var pos_x = Math.floor((parseInt(PCDobj.Panoramas.Panorama[num].direction.north) + dir * parseInt(PCDobj.Panoramas.Panorama[num].img.width) / 360) % parseInt(PCDobj.Panoramas.Panorama[num].img.width));
					if(CCDobj.Contents.Content[i].coords.height != undefined)
						var pos_y = parseInt(PCDobj.Panoramas.Panorama[num].img.height) / 2 - (Math.atan2(parseFloat(CCDobj.Contents.Content[i].coords.height) - 1.5, dist) / (Math.PI / 2) * (parseInt(PCDobj.Panoramas.Panorama[num].img.width) / 4));
					else
						var pos_y = parseInt(PCDobj.Panoramas.Panorama[num].img.height) / 2;
					var hsStr = "x" + Math.floor(pos_x) + " y" + Math.floor(pos_y) + " i'" + CCDobj.Contents.Content[i].detail.name + "' cffffff e u'javascript:contentWindow(" + i + ")' q";
					hsList[hsList.length] = hsStr;
				}
			}
		}
	}
	return hsList;
}

function round0360(kaku){
	var rkaku = Math.floor((360+kaku)%360);
	return rkaku;
}

function compByDistanceAsc(a,b){
	return a[1] - b[1];
}
function compByDistanceDesc(a,b){
	return b[1] - a[1];
}
function compByDirection(a, b){
	return a[2] - b[2];
}


//////////
// 視野角の表示
function angleOfView(panox, panoy, p, f){
	var userangle = (360+p-nowStat.offsetNorth)%360;
	var sa_ua = userangle - tmp_ua;
	var sa_f = f - tmp_f;
	var lx1,ly1,lx2,ly2;

	// 前回の更新からパン角 or 視野角が5°以上変化した場合のみ
	if((Math.abs(sa_ua) > 5) || (Math.abs(sa_f) > 5)){
		// 更新時の角度を保持
		tmp_ua = userangle;
		tmp_f = f;

		panox = parseFloat(panox);
		panoy = parseFloat(panoy);

		var lineLength = 50; // ラインの長さ 50m(固定)
		var ldx = lineLength * Math.sin((userangle + f / 2) * Math.PI / 180);
		var ldy = lineLength * Math.cos((userangle + f / 2) * Math.PI / 180);
		lx1 = panox + ldx / 6378137 / Math.cos(panoy * Math.PI / 180) * 180 / Math.PI;
		ly1 = panoy + ldy / 6378137 * 180 / Math.PI;

		ldx = lineLength * Math.sin((userangle - f / 2) * Math.PI / 180);
		ldy = lineLength * Math.cos((userangle - f / 2) * Math.PI / 180);
		lx2 = panox + ldx / 6378137 / Math.cos(panoy * Math.PI / 180) * 180 / Math.PI;
		ly2 = panoy + ldy / 6378137 * 180 / Math.PI;

		removeObject(lineObj);
		lineObj = addLine(lx1, ly1, panox,panoy, lx2, ly2);
	}
}
//////////


function DoAuto()
{
  appPTV.startAutoPan( 0.5, 0.0, 1.0 );
}
function DoUp()
{
  appPTV.startAutoPan( 0.0, 1.0, 1.0 );
}
function DoDown()
{
  appPTV.startAutoPan( 0.0, -1.0, 1.0 );
}
function DoLeft()
{
  appPTV.startAutoPan( -3.0, 0.0, 1.0 );
}
function DoRight()
{
  appPTV.startAutoPan( 3.0, 0.0, 1.0 );
}
function DoLeftAuto()
{
	appPTV.startAutoPan( -1.0, 0.0, 1.0 );
}
function DoRightAuto()
{
	appPTV.startAutoPan( 1.0, 0.0, 1.0 );
}
function DoZoomIn()
{
	flag_click = true;
	appPTV.startAutoPan( 0.0, 0.0, 1.0/1.025 );
}
function DoZoomOut()
{
	appPTV.startAutoPan( 0.0, 0.0, 1.025 );
}
function DoStop()
{
	flag_click = false;
	appPTV.stopAutoPan();
}

///////////


// コンテンツマーカークリック時の動作
function markerAction(i){
	contentWindow(i);
}

// コンテンツに最も近いパノラマ画像への移動
function gotoContent(num){
	if(num == -1) num = document.content.contentlist.selectedIndex;
	if(num != -1){
		var panoramaArray = new Array();
		var lng2 = parseFloat(CCDobj.Contents.Content[num].coords.lng) * Math.PI / 180;
		var lat2 = parseFloat(CCDobj.Contents.Content[num].coords.lat) * Math.PI / 180;
		for(var i=0;i<PCDobj.Panoramas.Panorama.length;i++){
			var lng1 = parseFloat(PCDobj.Panoramas.Panorama[i].coords.lng) * Math.PI / 180;
			var lat1 = parseFloat(PCDobj.Panoramas.Panorama[i].coords.lat) * Math.PI / 180;
			var dx = 6378137 * (lng2 - lng1) * Math.cos(lat1);
			var dy = 6378137 * (lat2 - lat1);
			var dist = Math.sqrt(dx * dx + dy * dy);
			panoramaArray[panoramaArray.length] = [PCDobj.Panoramas.Panorama[i].panoid, dist];
		}
		panoramaArray.sort(compByDistanceAsc);

		var pano_num = number[panoramaArray[0][0]];
		var lng1 = parseFloat(PCDobj.Panoramas.Panorama[pano_num].coords.lng) * Math.PI / 180;
		var lat1 = parseFloat(PCDobj.Panoramas.Panorama[pano_num].coords.lat) * Math.PI / 180;
		var dx = 6378137 * (lng2 - lng1) * Math.cos(lat1);
		var dy = 6378137 * (lat2 - lat1);
		var dir = Math.atan2(dx, dy);
		dir = dir * 180 / Math.PI;
		dir = (360 + dir) % 360;
		var pan = calcNorthOffset(PCDobj.Panoramas.Panorama[pano_num].panoid) + dir;

		changePano(PCDobj.Panoramas.Panorama[pano_num].panoid, pan, 0, 105);
	}
}

// コンテンツの詳細表示
function contentWindow(num){
	var template = "<html><head><title>詳細情報</title><link rel=stylesheet type=text/css href=style.css title=Type1 /></head><body>";
	template += "<center><div id=html></div></center></body></html>";
	var newWin = window.open("","newWin","width=520, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=no");
	newWin.document.write(template);
	var html = "<table width=500><tr><td align=center><b>" + CCDobj.Contents.Content[num].detail.name + "</b><br />";
	html += "<a href=" + contentBasePath + CCDobj.Contents.Content[num].img.src + " target=_blank>";
	html += "<img src=" + contentBasePath + CCDobj.Contents.Content[num].img.thumbsrc + " border=0></a><br /><br /><br />";
	html += CCDobj.Contents.Content[num].coment + "</td></tr></table>";
	newWin.document.getElementById("html").innerHTML = html;
	newWin.focus();
}

// コンテンツの一覧表示
function contentIchiran(){
	if(isCCDloaded == false) return;
	var template = "<html><head><title>コンテンツ一覧</title><link rel=stylesheet type=text/css href=style.css title=Type1 /></head><body>";
	template += "<center><div id=html></div></center></body></html>";
	var newWin2 = window.open("", "newWin2", "width=520, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=no");
	newWin2.document.write(template);

	var html = "<center><table width=400>";
	for(var i = 0; i < CCDobj.Contents.Content.length; i++){
		html += "<tr><td align=center valign=top>";
		if(CCDobj.Contents.Content[i].img != undefined){
			html += "<a href=" + contentBasePath + CCDobj.Contents.Content[i].img.src + " target=_blank>";
			html += "<img src=" + contentBasePath + CCDobj.Contents.Content[i].img.thumbsrc + " border=0></a>";
		}
		html += "</td><td><b>" + CCDobj.Contents.Content[i].detail.name + "</b><br /><br />";
		html += "<a href=javascript:opener.contentWindow(" + i + ");>詳しい情報を表示</a><br /><a href=javascript:opener.gotoContent(" + i + ");>ここへ移動</a></td></tr>";
	}
	html += "</table></center>";
	newWin2.document.getElementById("html").innerHTML = html;
	newWin2.focus();
}
