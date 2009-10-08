// ================================================================
// setting

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

var meta = new JKL.ParseXML(basePath + metaFileName);
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


//視野角の最小値と最大値
var fov_max = 140;
var fov_min = 40;

var firstfov = 105;
var firstpan = 0;

//後退切替用パラメータ
var previousStat = {};
previousStat.fov_next = 105;
previousStat.panoid = "";



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

//後退動作継続用フラグ
var flag_click_back = false;
//////////

// ================================================================
// start

function startload(){
	var funcMeta = function(data){
		onloadMeta(data);
	};
	meta.async(funcMeta);
	meta.parse();
}


//スタートメタファイル読み込みハンドラ
function onloadMeta(data){
	metaData = data;
	bmdFileName = metaData.PasQ.InitialDataUrl.BMD.src;
	pcdFileName = metaData.PasQ.InitialDataUrl.PCD.src;
	// コンテンツがない場合はメタファイルのCCDを省略 or CCD.srcを空文字に
	if(metaData.PasQ.InitialDataUrl.CCD){
		ccdFileName = metaData.PasQ.InitialDataUrl.CCD.src;
	}
	//BMDファイル読込
	bmd = new JKL.ParseXML(basePath+bmdFileName);
	var funcBMD = function(data){	
		onloadBMD(data);
	};
	bmd.async(funcBMD);	
	bmd.parse();
	
	//PCDファイル読込
	pcd = new JKL.ParseXML(basePath + pcdFileName);
	var funcPCD = function(data){
		onloadPCD(data);
	};
	pcd.async(funcPCD);
	pcd.parse();
	
	
	// CCDファイルがある場合、CCDファイル読込
	if(ccdFileName){
		ccd = new JKL.ParseXML(basePath+ccdFileName);
		var funcCCD = function(data){	
			onloadCCD(data);
		};
		ccd.async(funcCCD);
		ccd.parse();
	}
	else{
		//CCDないけど、読込完了したということにする
		isCCDloaded = true;
		checkAllReady();
	}
}

function onloadBMD(data){
	BMDobj = data.BMD;
	
	// Google Mapsの読込 (pasq-map.js)
	loadMap();
	isBMDloaded = true;
	checkAllReady();
}


function onloadPCD(data){
	PCDobj = data.PCD;
	
	// panoidとPanorama配列の添字の関連付け
	for(var i=0; i<PCDobj.Panoramas.Panorama.length; i++){
		number[PCDobj.Panoramas.Panorama[i].panoid] = i;
	}
	
	isPCDloaded = true;
	checkAllReady();
	
}

function onloadCCD(data){
	CCDobj = data.CCD;
	isCCDloaded = true;
	checkAllReady();
}


// BMD、PCD、CCDの読込が完了していたらスタート
function checkAllReady(){
	
	if(isBMDloaded && isPCDloaded && isCCDloaded){
		makeAppletTag();

		//map-decolation.jsのopuMap関数
		opuMap();
	
		startCalculate();
	}
}



function makeAppletTag(){

	var aptag = document.createElement("applet");
	aptag.setAttribute("archive",appletPath);
	aptag.setAttribute("code",appletClass);
	aptag.setAttribute("width",appletWidth);
	aptag.setAttribute("height",appletHeight);
	aptag.setAttribute("fov",firstfov);
	aptag.setAttribute("id",appletId);
	aptag.setAttribute("name",appletName);
	aptag.setAttribute("mayscript",appletMayscript);
	
	makeParamTag(aptag);

	document.getElementById("area_view").appendChild(aptag);

	appPTV = document.ptviewer;

}



/**
 * appletタグにparamタグを付加
 * @param aptag -AppletタグのElement
 * 
 */
function makeParamTag(aptag){
	// PCDファイルからの初期方位の暫定値
	if(PCDobj.Panoramas.startdir){
		firstpan = parseInt(PCDobj.Panoramas.startdir,10);
	}else{
		firstpan = 0;
	}
	// アドレスパラメータからの初期パノラマ・初期方位を設定
	if(window.location.search){
		var str = window.location.search;
		
		// 初期パノラマの指定のみ
		if(str.indexOf("&") == -1){
			PCDobj.Panoramas.startpano = str.substring(str.indexOf("id=",0) + 3);
		}
		
		// 初期パノラマ・初期方位の両方を指定
		else{
			PCDobj.Panoramas.startpano = str.substring(str.indexOf("id=") + 3, str.indexOf("&"));
			firstpan = parseInt(str.substring(str.indexOf("dir=",0) + 4),10);
		}
	}

	// 初期方位をPTViewerに渡すためのパン角に変換
	firstpan = (calcNorthOffset(PCDobj.Panoramas.startpano) + firstpan) % 360;
	if(firstpan > 180){
		firstpan -= 360;
	}
	// スタートパノの登録
	var paramtag = makeParamTagElement("file", basePath + PCDobj.Panoramas.Panorama[number[PCDobj.Panoramas.startpano]].img.src);
	aptag.appendChild(paramtag);
	paramtag = makeParamTagElement("getview", "getview");
	aptag.appendChild(paramtag);
	paramtag = makeParamTagElement("pan", firstpan);
	aptag.appendChild(paramtag);
	paramtag = makeParamTagElement("fovmax",fov_max);
	aptag.appendChild(paramtag);
	paramtag = makeParamTagElement("fovmin",fov_min);

	
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



function startCalculate(){
/*
	//マップにパノラマの位置を設定
	for(var i=0; i<PCDobj.Panoramas.Panorama.length; i++){
		panomarker[i] = setPanoMarker(PCDobj.Panoramas.Panorama[i].coords.lng, PCDobj.Panoramas.Panorama[i].coords.lat);
	}
*/

	// マップにコンテンツを設定 (ある場合のみ)
	if(isCCDloaded){
		var html = '<form name="content"><a href="javascript:contentIchiran();">コンテンツを一覧表示</a><br />' +
			 '<select name="contentlist" size="10"></select><br />' +
			 '<input type="button" value="コンテンツの近くへ移動" onclick="gotoContent(-1)" /></form>';
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
		var sd = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.start,10);
		var ed = parseInt(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].range.end,10);
		var j;
		if(sd > ed){ // 0度をまたぐとき
			for(j=sd; j<=359; j++){
				arLink[j] = PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid;
			}
			for(j=0; j<=ed; j++){
				arLink[j] = PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid;
			}
		}else{
			for(j=sd; j<=ed; j++){
				arLink[j] = PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid;
			}
		}
	}
	
	return arLink;
}


function getview(p,t,f){
	var num = number[nowStat.panoid];
//////////
	angleOfView(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat, p, f);
//////////

	
	if(nowStat.arLink[round0360(p-nowStat.offsetNorth)] != undefined){
		var targetpano = nowStat.arLink[round0360(p-nowStat.offsetNorth)];
		
		for(var i = 0; i < PCDobj.Panoramas.Panorama[num].chpanos.chpano.length; i++){
			if(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid == targetpano){
				//視野角fが設定値以下になったときパノラマ画像を切替
				if(f < parseFloat(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].fov.base)){
					var id = PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].panoid;
					// パン角の補正
					p = (p-nowStat.offsetNorth+calcNorthOffset(id)) - PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].correct.pan;
					// チルト角の補正
					t = t - PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].correct.tilt;
					
					//後退切替を可能にするためにback_nextに切替視野角を格納
					previousStat.fov_next = parseFloat(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].fov.next);
					previousStat.panoid = nowStat.panoid;
					
					//切替後のパノラマ画像のpanoid,p,t,切替後の視野角を与えて、画像切替
					changePano(id,p,t,parseFloat(PCDobj.Panoramas.Panorama[num].chpanos.chpano[i].fov.next));
				}
			}
		}
	}
				
	////////////////////////////////////////////後退切替処理
	//全探索で今の方位で現在のパノラマ画像に切り替わるリストを作成
	//そのリストの中に一つ前のパノラマがあれば、それに切換え
	//なければ、リストの一番目に切換え


	//視野角が切り替えたときの値より大きいときは後退切替判定を行う
	if(f > previousStat.fov_next){
		//画像における位置を示す角度pを方位を示すtemp_pに変換する
		var temp_p = p - calcNorthOffset(nowStat.panoid);
		if(temp_p<0){
			temp_p = temp_p+360;
		}
		
		var count=0;
		var back_panoidList = new Array();
		var back_panoid = "";
			
		//後退のときに切り替えるべきパノラマ画像が判明していないとき後退時に切り替えるべきパノラマ画像を探す
		for(var j = 0; j < PCDobj.Panoramas.Panorama.length; j++){
			for(var k = 0; k<PCDobj.Panoramas.Panorama[j].chpanos.chpano.length; k++){
				//切替先に今のパノラマ画像が設定されているパノラマ画像を探す
				if(PCDobj.Panoramas.Panorama[j].chpanos.chpano[k].panoid === nowStat.panoid){
					//切替先に今のパノラマ画像が設定されていて、その切替角度範囲に現在の角度が含まれているパノラマ画像を探す
					//rangeのstartとend間で360度をまたがないとき
					if(parseFloat(PCDobj.Panoramas.Panorama[j].chpanos.chpano[k].range.start) < parseFloat(PCDobj.Panoramas.Panorama[j].chpanos.chpano[k].range.end)){
						if(parseFloat(PCDobj.Panoramas.Panorama[j].chpanos.chpano[k].range.start) <= temp_p && parseFloat(PCDobj.Panoramas.Panorama[j].chpanos.chpano[k].range.end) > temp_p){
							back_panoidList[count] = PCDobj.Panoramas.Panorama[j].panoid;
							count++;
						}
					}
					//rangeのstartとend間で360度をまたぐとき
					else{
						if(parseFloat(PCDobj.Panoramas.Panorama[j].chpanos.chpano[k].range.start) >= temp_p || parseFloat(PCDobj.Panoramas.Panorama[j].chpanos.chpano[k].range.end) < temp_p){
							back_panoidList[count] = PCDobj.Panoramas.Panorama[j].panoid;
							count++;
						}
					}		
				}
			}
		}
		
		//後退切換画像がないとき、何もしない
		if(count<=0){
			return;
		}
		//後退切換画像があるとき、後退切替の画像候補の中から適切なものを探す
		else{
			//後退切替候補の中に現在の状態に切替える前のpanoidが含まれれば、それを後退切替画像とする
			for(i=0;i<count;i++){
				if(back_panoidList[i] == previousStat.panoid){
					back_panoid = previousStat.panoid;
				}
			}
			//後退切替広報の中に現在の状態に切替える前のpanoidが含まれていないとき、とりあえずbacki_panoidListの一番目を後退切替画像とする
			if(back_panoid === ""){
				back_panoid = back_panoidList[0];
			}
		}
		
		//切り替える画像があるとき切り替える。後退切替画像のpanoid、現在のpanoidから切替視野角を求め、切り替える
		var temp_num_chpano;
		var temp_backid = number[back_panoid];
		
		for(j=0;j<PCDobj.Panoramas.Panorama[temp_backid].chpanos.chpano.length;j++){
			if(PCDobj.Panoramas.Panorama[temp_backid].chpanos.chpano[j].panoid == nowStat.panoid){
				temp_num_chpano = j;
			}
		}
		if(back_panoid !=="" && f>PCDobj.Panoramas.Panorama[temp_backid].chpanos.chpano[temp_num_chpano].fov.next){
			//パン角の補正
			p = (p-nowStat.offsetNorth+calcNorthOffset(PCDobj.Panoramas.Panorama[temp_backid].panoid));
			//パノラマ画像切替
			changePano(PCDobj.Panoramas.Panorama[temp_backid].panoid,p,t,parseFloat(PCDobj.Panoramas.Panorama[temp_backid].chpanos.chpano[temp_num_chpano].fov.base));
		}
	}	
	
}

function changePano(panoid,p,t,f){
	
	p = (p)? p: 0;
	t = (t)? t: 0;
	f = (f)? f: 105;

	calcNowStat(panoid);
	
	//calculate offset for north
	var northdir = calcNorthOffset(panoid);

	var num = number[panoid];
	
	// PTViewerに渡すパノラマ指定用データ作成
	var str = "param name=" + panoid + " value=";
	str += "{getview=getview}";
	str += "{file="+ basePath + PCDobj.Panoramas.Panorama[num].img.src +"}";
	str += "{fovmax=" + fov_max + "}";
	str += "{fovmin=" + fov_min + "}";
	
	// hotspotの動的追加
	var hsList = calcHS(panoid);
	if(hsList.length){
		for(var i = 0; i < hsList.length; i++){
			str += "{hotspot" + i + "=" + hsList[i] + "}";
		}
	}

	appPTV.newPano(str, p, t, f);
	
		
	tmp_ua = 370;
	removeObject(centerMarker);
	centerMarker = setCenterMarker(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat);
	goCenter(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat);
	angleOfView(PCDobj.Panoramas.Panorama[num].coords.lng, PCDobj.Panoramas.Panorama[num].coords.lat, p, f);

	if(flag_click === true){
		appPTV.startAutoPan( 0.0, 0.0, 1.0/1.025 );
	}
	if(flag_click_back === true){
		appPTV.startAutoPan(0.0,0.0,1.025);
	}
}

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
		for(i=0;i<CCDobj.Contents.Content.length;i++){
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
					if((tmp_dir >= sd) || (tmp_dir <= ed)){
						flag_content = true;
					}
				}
				else if((tmp_dir >= sd) && (tmp_dir <= ed)){
					flag_content = true;
				}
				
				// コンテンツの有効範囲内であればhotspotの作成
				// 現在はコンテンツへの方位から推測した位置にコンテンツ名称の表示
				// コンテンツに高さ情報があれば、パノラマ画像の高さ(現在1.5m固定)と比較し縦方向の位置も推測(なければ画像中央)
				if(flag_content){
					var pos_x = Math.floor((parseInt(PCDobj.Panoramas.Panorama[num].direction.north,10) + dir * parseInt(PCDobj.Panoramas.Panorama[num].img.width,10) / 360) % parseInt(PCDobj.Panoramas.Panorama[num].img.width,10));
					var pos_y;
					if(CCDobj.Contents.Content[i].coords.height != undefined){
						pos_y = parseInt(PCDobj.Panoramas.Panorama[num].img.height,10) / 2 - (Math.atan2(parseFloat(CCDobj.Contents.Content[i].coords.height) - 1.5, dist) / (Math.PI / 2) * (parseInt(PCDobj.Panoramas.Panorama[num].img.width,10) / 4));
					}else{
						pos_y = parseInt(PCDobj.Panoramas.Panorama[num].img.height,10) / 2;
					}
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
	flag_click_back = true;
	appPTV.startAutoPan( 0.0, 0.0, 1.025 );
}
function DoStop()
{
	flag_click = false;
	flag_click_back = false;
	appPTV.stopAutoPan();
}


///////////


// コンテンツマーカークリック時の動作
function markerAction(i){
	contentWindow(i);
}

// コンテンツに最も近いパノラマ画像への移動
function gotoContent(num){
	if(num == -1){
		num = document.content.contentlist.selectedIndex;
	}
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
		lng1 = parseFloat(PCDobj.Panoramas.Panorama[pano_num].coords.lng) * Math.PI / 180;
		lat1 = parseFloat(PCDobj.Panoramas.Panorama[pano_num].coords.lat) * Math.PI / 180;
		dx = 6378137 * (lng2 - lng1) * Math.cos(lat1);
		dy = 6378137 * (lat2 - lat1);
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
	if(isCCDloaded === false){
		return;
	}
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
