
var BasePath = "./resource/";
var ContentBasePath = "./content/";
var MetaFileName = "meta.xml";

//アプレット設定
var AppletPath = "PTViewer.jar";
var AppletClass = "ptviewer.class";
var AppletWidth = 900;
var AppletHeight = 360;
var AppletId = "ptviewer";
var AppletName = "ptviewer";

var BMDobj = {};
var PCDobj = {};
var CCDobj = {};
var appPTV = {};

//地図用変数
var centerMarker = {};
var lineObj = {};
var panoid_preUpdateMap;  //地図更新　軽減変数
var dir_preUpdateMap = startdir;  //地図更新　軽減変数
var fov_preUpdateMap = startfov;  //地図更新　軽減変数

//PasQ起動時の初期パラメータ変数
var startdir = 0;
var startpanoid;
var startfov = 105;

//PasQパラメータ
var FovMax = 140;  //視野角の最大値(定数)
var FovMin = 40;  //視野角の最小値(定数)
var nowState = {};  //現在値オブジェクト
nowState.pan = 0;
nowState.tilt = 0;
nowState.fov = startfov;
nowState.panoid = startpanoid;  //現在のパノラマid
nowState.dir = startdir;  //現在の方位


//今のパノラマ画像を切り替える前のfov(PCDに後退切替用のパラメータを設定すれば必要なくなる変数)
var fov_preChange = startfov;


//panoidからPanorama配列の添え字を逆引きするための連想配列
var panoidToPanoNumber = new Array();
//panoidからコンテンツ情報を求めるテーブルオブジェクト
var panoidToContents = new Array();


//フラグ
var loadFinishBMD = false;
var loadFinishPCD = false;
var loadFinishCCD = false;
var exist_CCD = true;
var flag_click_go = false;
var flag_click_back = false;



//スタート
//---必要ファイルの読込---
	function start(){
		//metaファイルの読込・解析
		var meta = new JKL.ParseXML(BasePath + MetaFileName);
		var parseMeta = function(metaData){
			loadMeta(metaData);
		};
		meta.async(parseMeta);
		meta.parse();
	}

	/**
	 *	metaファイルに従ったbmd,pcd,ccdファイルを読込
	 *	@param metaData 読み込んだmetaファイル内容(json形式)
	 */
	function loadMeta(metaData){
		//BMDファイル読込
		var bmdFileName = metaData.PasQ.InitialDataUrl.BMD.src;
		var bmd = new JKL.ParseXML(BasePath + bmdFileName);
		var parseBMD = function(data){
			loadBMD(data);
		};
		bmd.async(parseBMD);
		bmd.parse();
		
		
		//PCDファイル読込
		var pcdFileName = metaData.PasQ.InitialDataUrl.PCD.src;
		var pcd = new JKL.ParseXML(BasePath + pcdFileName);
		var parsePCD = function(data){
			loadPCD(data);
		};
		pcd.async(parsePCD);
		pcd.parse();
		
		
		//CCDファイル読込処理
		//metaファイルにCCDファイルの指定がある場合、CCDファイルを読み込む
		if(metaData.PasQ.InitialDataUrl.CCD){
			exist_CCD = true;
			var ccdFileName = metaData.PasQ.InitialDataUrl.CCD.src;
			
			//CCDファイル読込
			var ccd = new JKL.ParseXML(BasePath + ccdFileName);
			var parseCCD = function(data){
				loadCCD(data);
			};
			ccd.async(parseCCD);
			ccd.parse();
		}
		//metaファイルにCCDファイルの指定がない場合、フラグ管理
		else{
			exist_CCD = false; //CCDファイルは存在しない
			checkAllLoaded();
		}
	}
	
	
	/**
	 *	BMDファイルを読み込み、マップを設定する
	 *	@param data 読み込んだBMDファイル内容(配列)
	 */
	function loadBMD(data){
		BMDobj = data.BMD;
		loadFinishBMD = true;　//BMDファイル読込終了
		checkAllLoaded();
	}

	
	/**
	 *	PCDファイルを読み込み、panoidとPCDobj(配列)の対応テーブル作成
	 *	@param data PCDファイル内容(配列)
	 */
	function loadPCD(data){
		PCDobj = data.PCD;
		loadFinishPCD = true;  //PCDファイル読込終了
		checkAllLoaded();
	}
	
	
	/**
	 *	CCDファイルを読み込む
	 *	@param data CCDファイル内容(配列)
	 */
	function loadCCD(data){
		CCDobj = data.CCD;
		loadFinishCCD = true;　　//CCDファイル読込終了
		checkAllLoaded();
	}
	
	
	/**
	 *	BMD,PCD,CCDの読込が終了していれば、PasQ初期設定を行う
	 */
	function checkAllLoaded(){
		//CCDファイルがあるとき
		if(exist_CCD){
			if(loadFinishBMD && loadFinishPCD && loadFinishCCD){
				setup();  //PasQの設定をする
			}
		}
		//CCDファイルがないとき
		else{
			if(loadFinishBMD && loadFinishPCD){
				setup();  //PasQの設定をする
			}
		}
	}
//---必要ファイルの読込　終了---




//---PasQの設定---
	/**
	 *	PasQの設定を行う
	 */
	function setup(){
		createTable_panoidToPanoramaNumber();  //panoidとPCDobjのPanoramaの添え字と対応付ける
		createTable_panoidToContents();  //panoidとコンテンツを対応付ける
		getStartParameter();  //PTViwer,マップ設定に必要なパラメータの取得
		setupMap();  //マップの初期設定
		setupPTViewer();  //PTViewer初期設定
		if(exist_CCD){
			placeContents();  //コンテンツの一覧リスト作成、マップ上配置
		}
	}

	
	/**
	 *	panoidからPCDobjのPanoramaの添え字を逆引きできるようにするために、それようの連想配列を作成
	 */
	function createTable_panoidToPanoramaNumber(){
		//panoidとPCDobjのPanoramaとの対応テーブル作成(連想配列を用いて、panoidを基にPCDobj.Panoramas.Panoramaの番号がすぐに判明できるようにする)
		for(var i=0;i<PCDobj.Panoramas.Panorama.length;i++){
			panoidToPanoNumber[PCDobj.Panoramas.Panorama[i].panoid] = i;
		}
	}
	
	
	/**
	 *	panoidとコンテンツのテーブル作成
	 */
	function createTable_panoidToContents(){
		var pano = PCDobj.Panoramas;
		//パノラマ画像の数だけ繰り返す(全通り計算する)
		for(var i=0; i<pano.Panorama.length; i++){
			var num_contents = 0;
			panoidToContents[pano.Panorama[i].panoid] = new Object();
			panoidToContents[pano.Panorama[i].panoid].contents = new Array();
			//CCDがある時、CCDの情報(コンテンツの位置、有効範囲、有効方位)とパノラマ画像の位置情報からテーブル作成
			if(exist_CCD){
				//コンテンツの数だけ計算する
				for(var j=0; j<CCDobj.Contents.Content.length; j++){
					//パノラマ画像がコンテンツの有効範囲内にあるかどうかチェック
					var flag_inContentScope = checkContentScope(pano.Panorama[i] , CCDobj.Contents.Content[j]);
					if(flag_inContentScope){
						//テーブル作成処理
						var string = createHotspotString(pano.Panorama[i] , CCDobj.Contents.Content[j],j);
						panoidToContents[pano.Panorama[i].panoid].contents[num_contents] = string; 
						num_contents++;
					}
				}
			}
						
			//PCDにhotspotの記述がある場合、CCD読込から作成したテーブルにその分を追加
			if(pano.Panorama[i].hotspots && pano.Panorama[i].hotspots.hotspot){
				if(pano.Panorama[i].hotspots.hotspot.length){
					for(var j=0; j<pano.Panorama[i].hotspots.hotspot.length; j++){
						var string = pano.Panorama[i].hotspots.hotspot[j];
						panoidToContents[pano.Panorama[i].panoid].contents[num_contents] = string;
						num_contents++; 
					}
				}
			}
		}
	}
	
	
	/**
	 *	PTViewerに渡すホットスポット生成用文字列を生成する
	 *	@param	obj_pano	パノラマオブジェクト
	 *	@param	obj_contents	コンテンツオブジェクト
	 *	@return	文字列
	 */
	function createHotspotString(obj_pano , obj_content , j){
		//パノラマ、コンテンツの緯度・経度を取得
		var lat_pano = parseFloat(obj_pano.coords.lat);
		var lng_pano = parseFloat(obj_pano.coords.lng);
		var lat_content = parseFloat(obj_content.coords.lat);
		var lng_content = parseFloat(obj_content.coords.lng);
		
		//パノラマ画像からコンテンツへの方位・距離を求める
		var dir = direction(lat_pano,lng_pano,lat_content,lng_content);
		var dist = distance(lat_pano,lng_pano,lat_content,lng_content);
		
		//パノラマ画像中の位置を求める  (y_imageの方は修正が必要か?)
		var x_image = Math.floor( (parseInt(obj_pano.direction.north,10) + dir / 360 * parseInt(obj_pano.img.width,10) ) % parseInt(obj_pano.img.width,10));
		var y_image;
		if(obj_content.coords.height != undefined){
			y_image = parseInt(obj_pano.img.height,10) / 2 - (Math.atan2(parseFloat(obj_content.coords.height) - 1.5, dist) / (Math.PI / 2) * (parseInt(obj_pano.img.width,10) / 4));
		}
		//コンテンツに高さが設定されていない場合は、高さをパノラマ画像の中央にする
		else{
			y_image = parseInt(obj_pano.img.height,10) / 2;
		}
		
		//ホットスポット用文字列生成
		var string = "x" + Math.floor(x_image) + " y" + Math.floor(y_image) + " i'" + obj_content.detail.name + "' e cffffff u'javascript:contentWindow(" + j + ")' q";
		return string;
	}
	
	
	
	/**
	 *	与えられたパノラマ画像が与えられたコンテンツの有効範囲内にあるかどうかチェックする
	 *	@param	panoramaObj	パノラマ画像のオブジェクト
	 *	@param	contentObj	コンテンツオブジェクト
	 *	@return 真偽値
	 */
	function checkContentScope(panoramaObj, contentObj){
		var pano_lat = parseFloat(panoramaObj.coords.lat);  //パノラマ画像の緯度
		var pano_lng = parseFloat(panoramaObj.coords.lng);  //パノラマ画像の経度

		//コンテンツの位置情報取得
		var content_lat = parseFloat(contentObj.coords.lat);  //コンテンツの緯度
		var content_lng = parseFloat(contentObj.coords.lng);  //コンテンツの経度

		
		//パノラマ画像とコンテンツの距離を計算
		var distance_PanoCont = distance(pano_lat,pano_lng,content_lat,content_lng);
		
		//パノラマ画像がコンテンツの有効範囲内にあるかどうか調査
		//パノラマ画像とコンテンツ間の距離がコンテンツの有効距離内であるとき
		if(contentObj.range && (distance_PanoCont <= parseFloat(contentObj.range.radius))){
			//パノラマ画像の位置がコンテンツの有効範囲以内であるかどうかチェック
			if(checkContentAngle(pano_lat,pano_lng,contentObj)){
				//パノラマ画像がコンテンツの有効距離、方位内にあるときtrueを返す
				return true;
			}
		}
		
		//パノラマ画像がコンテンツの有効範囲内にないときfalseを返す
		return false;
	}
	
	
	
	/**
	 *	AとBの緯度・経度から、AB間の距離を求める
	 *	@param latA,lngA Aの緯度、経度
	 *	@param latB,lngB Bの緯度、経度
	 *	@return AB間の距離
	 */
	function distance(latA,lngA,latB,lngB){
		//緯度・経度をラジアンに変換
		latA = latA * Math.PI / 180;
		lngA = lngA * Math.PI / 180;
		latB = latB * Math.PI / 180;
		lngB = lngB * Math.PI / 180;
		
		//距離計算(どっかのサイトにこんな計算式があった。精度不明)
		var dx = 6378137 * (lngB - lngA) * Math.cos(latA);
		var dy = 6378137 * (latB - latA);
		var distance = Math.sqrt(dx * dx + dy * dy);
		return distance;
	}
	
	
	/**
	 *	与えられた位置情報(緯度・経度)がコンテンツの有効方位内にあるかどうかチェック
	 *	@param	lat,lng	緯度,経度
	 *	@param	contentObj	コンテンツオブジェクト
	 *	@return	真偽
	 */
	function checkContentAngle(lat,lng,contentObj){
		//コンテンツの緯度・経度取得
		var c_lat = parseFloat(contentObj.coords.lat);
		var c_lng = parseFloat(contentObj.coords.lng);

		//緯度・経度をラジアンに変換
		lat = lat * Math.PI / 180;
		lng = lng * Math.PI / 180;
		c_lat = c_lat * Math.PI / 180;
		c_lng = c_lng * Math.PI / 180;
		
		//コンテンツからパノラマ画像への角度を求める
		var dx = 6378137 * (lng - c_lng) * Math.cos(c_lat);
		var dy = 6378137 * (lat - c_lat);
		var angle = Math.atan2(dy,dx);  //Math.atan2の結果はラジアン
		angle = angle * 180 / Math.PI;  //ラジアンを度に変換
		angle = (360 + angle) % 360; //度に変換したとき、その値がマイナスである可能性があるため、必ずプラスになるように変換
		
		//求めた角度を方位に変換
		var dir = (360 - angle + 90) % 360;
		
		//コンテンツの有効方位を取得
		var dir_start = contentObj.range.angle_s;
		var dir_end = contentObj.range.angle_e;
		
		//コンテンツの有効方位内にあるかどうかチェック
		var flag_InContentAngle = false;
		//有効方位が0度をまたぐとき
		if(dir_end < dir_start){
			if( dir >= dir_start || dir <= dir_end){
				flag_InContentAngle = true;
			}
		}
		//有効方位が0度をまたがないとき
		else if(dir >= dir_start && dir <= dir_end){
			flag_InContentAngle = true;
		}
		
		//コンテンツの有効範囲内にあったかどうかを真偽値で返す
		return flag_InContentAngle;
	}
	
	
	
	
	/**
	 *	PTViewer,マップの初期設定に必要なパラメータ(初期方位、初期パノラマ)の取得
	 *	アドレスパラメータからの取得部分は修正が必要かも。dir,idの順番のとき、ちゃんと処理できない
	 */
	function getStartParameter(){	
		//PCDファイルからの初期パノラマ・初期方位設定
		if(PCDobj.Panoramas.startdir){
			startdir = parseInt(PCDobj.Panoramas.startdir,10);
		}
		startpanoid = PCDobj.Panoramas.startpano;
		
		//アドレスパラメータからの初期パノラマ・初期方位設定(PCDファイルからの読込より優先される)
		if(window.location.search){
			var str = window.location.search;
			//初期パノラマの指定のみ
			if(str.indexOf("&") == -1){
				startpanoid = str.substring(str.indexOf("id=",0) + 3);
			}
			//初期パノラマ・初期方位の両方を指定
			else{
				startpanoid = str.substring(str.indexOf("id=") + 3, str.indexOf("&"));
				startdir = parseInt(str.substring(str.indexOf("dir=",0) + 4),10);
			}
		}
		
		//現在値を初期値に設定
		nowState.panoid = startpanoid;
		nowState.dir = startdir;
	}
	
	
	
	//マップ処理は修正が必要
	function setupMap(){
		//地図更新用パラメータ設定
		dir_preUpdateMap = nowState.dir;
		fov_preUpdateMap = nowState.fov;
		panoid_preUpdateMap = nowState.panoid;
		
		//初期パノラマの位置取得
		var start_lat = parseFloat(PCDobj.Panoramas.Panorama[panoidToPanoNumber[startpanoid]].coords.lat);
		var start_lng = parseFloat(PCDobj.Panoramas.Panorama[panoidToPanoNumber[startpanoid]].coords.lng);
		
		//地図の読込
		loadMap();
		opuMap();  //県大地図の配置
		
		//マーカー設置
		centerMarker = setCenterMarker(start_lat , start_lng);
		//初期位置に移動
		goCenter(start_lat, start_lng);
		//視野角の表示
		lineObj = setupMap_fov(start_lat,start_lng,startdir,startfov)
	}
	
	
	/**
	 *	地図上に視野角を表示する(setup)
	 *	@param	lat	現在地の緯度(float)
	 *	@param	lng	現在地の経度(float)
	 *	@param 	dir	現在向いている方位(int)
	 *	@param	fov	現在の視野角(float)
	 */
	function setupMap_fov(lat,lng,dir,fov){
		var lineLength = 50;  //ラインの長さ 50m
		var angle = (360 + 90 - dir) % 360;  //方位を角度に変換
		angle = angle * Math.PI / 180;  //角度をラジアンに変換
		fov = fov * Math.PI / 180;  //fovをラジアンに変換
		
		//与えられた方位・視野角でラインを伸ばしたときのx,y成分(その1)
		var lineLength1_x = lineLength * Math.sin(angle + fov/2);
		var lineLength1_y = lineLength * Math.cos(angle + fov/2);		
		//与えられた方位・視野角でラインを伸ばしたときの緯度・経度(その1)
		lat_line1 = lat + lineLength1_x / 6378137 * 180 / Math.PI;
		lng_line1 = lng + lineLength1_y / 6378137 / Math.cos(lat * Math.PI / 180) * 180 / Math.PI;		

		//与えられた方位・視野角でラインを伸ばしたときのx,y成分(その2)
		var lineLength2_x = lineLength * Math.sin(angle - fov/2);
		var lineLength2_y = lineLength * Math.cos(angle - fov/2);
		//与えられた方位・視野角でラインを伸ばしたときの緯度・経度(その2)
		lat_line2 = lat + lineLength2_x / 6378137 * 180 / Math.PI;
		lng_line2 = lng + lineLength2_y / 6378137 / Math.cos(lat * Math.PI / 180) * 180 / Math.PI;
		
		//ライン表示
		lineObj = addLine(lat_line1,lng_line1,lat,lng,lat_line2,lng_line2);
		return lineObj;
	}
	
	
	
	

	

	
	
	/**
	 *	PTViewerの設定
	 */
	function setupPTViewer(){
		var aptag = document.createElement("applet");
		aptag = setupApplet(aptag);  //アプレットとしての設定
		
		//初期方位をPTViewerに渡すために、パン角に変換
		var startpan = (panImageNorth(startpanoid) + startdir) % 360;
		if(startpan > 180){
			startpan -= 360;
		}			
		nowState.pan = startpan;
	
		//PTViewer初期設定(paramタグを作成し、PTViewerにパラメータを与える)
		//画像の指定
		aptag.appendChild(createParamTagElement("file", BasePath + PCDobj.Panoramas.Panorama[panoidToPanoNumber[startpanoid]].img.src));
		//getview
		aptag.appendChild(createParamTagElement("getview", "getview"));
		//pan
		aptag.appendChild(createParamTagElement("pan", startpan));
		//fov
		aptag.appendChild(createParamTagElement("fov", startfov));
		//FovMax
		aptag.appendChild(createParamTagElement("fovmax", FovMax));
		//fovmin
		aptag.appendChild(createParamTagElement("fovmin", FovMin));
		//ホットスポット
		if(panoidToContents[startpanoid].contents.length){
			for(var i=0; i<panoidToContents[startpanoid].contents.length; i++){
				aptag.appendChild(createParamTagElement("hotspot" + i,panoidToContents[startpanoid].contents[i]));
			}
		}
		
		//PTViewerをarea_viewの子要素として追加
		document.getElementById("area_view").appendChild(aptag);
		appPTV = document.ptviewer;  //document.ptviewerと毎回書くの面倒なのでappPTVとする
	}
	
	
	/**
	 *	PTViewerのアプレットとしての設定
	 */
	function setupApplet(aptag){
		aptag.setAttribute("archive",AppletPath);  //アプレットのアーカイブ
		aptag.setAttribute("code",AppletClass);  //アプレットのクラス
		aptag.setAttribute("width",AppletWidth);  //アプレットの横幅
		aptag.setAttribute("height",AppletHeight);  //アプレットの縦幅
		aptag.setAttribute("fov",startfov);
		aptag.setAttribute("id",AppletId);  
		aptag.setAttribute("name",AppletName);
		aptag.setAttribute("mayscript", "true");  //mayscriptをtrueにしておくことで、JavaとJavascriptの通信が可能に
		return aptag;
	}
	
	
	/**
	 *	パノラマ画像における北の位置をパン角で返す。
	 *	中心を0度、左端を-180度、右端を180度とする。
	 *	@param panoid	パノラマ画像のid
	 *	@return	画像中における北のパン角
	 */
	function panImageNorth(panoid){
		var pw = PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid]].img.width;
		var nw = PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid]].direction.north;
		var northpan = nw/pw*360-180;
		return northpan;
	}	
		
	
	/**
	 *	paramタグをname属性、value属性ありで作成する
	 *	@param name name属性の文字列
	 *	@param value value属性の文字列
	 *	@return paramタグの要素
	 */
	function createParamTagElement(name , value){
		var paramtag = document.createElement("param");
		paramtag.setAttribute("name",name);
		paramtag.setAttribute("value",value);
		return paramtag;
	}
	
	
	
	/**
	 *	コンテンツ一覧リスト生成、マップ上にコンテンツマーカー配置
	 * 	(26個以上コンテンツがあるとき、どうするの?) 	
	 */
	function placeContents(){
		var alphabet = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
		var html = '<form name="content"><a href="javascript:contentIchiran();">コンテンツを一覧表示</a><br />' +
				   '<select name="contentlist" size="10">' ;
		for(var i=0; i<CCDobj.Contents.Content.length; i++){
			var clat = CCDobj.Contents.Content[i].coords.lat;  //content latitude(clat)
			var clng = CCDobj.Contents.Content[i].coords.lng;  //contant longitude(clng)
			setContentMarker(clat, clng, i, i % 26);  //アルファベット付コンテンツ用マーカーを地図に設置
			html += '<option> ' + alphabet[i%26] + '.'+CCDobj.Contents.Content[i].detail.name + '</option>';
		}
		html +=	'</select><br />' +
				'<input type="button" value="コンテンツの近くへ移動" onclick="gotoContent(-1)" />' +
				'</form> ';
		document.getElementById("area_content").innerHTML = html;		
	}
	
	
	
//--------------getview--------------------
	/**
	 *	PTViewerの値が更新されるたびに呼び出される関数。PTViwerの値に応じてパノラマ切替、地図更新を行う
	 *	@param pan	PTViewerから渡されるpan
	 *	@param tilt	PTViewerから渡されるtilt
	 *	@param fov	PTViewerから渡されるfov
	 */
	function getview(pan,tilt,fov){
		//現在値更新
		nowState.pan = pan;
		nowState.tilt = tilt;
		nowState.fov = fov;
		//方位更新
		var panoWidth = parseInt(PCDobj.Panoramas.Panorama[panoidToPanoNumber[nowState.panoid]].img.width);
		var panoNorth = parseInt(PCDobj.Panoramas.Panorama[panoidToPanoNumber[nowState.panoid]].direction.north);
		nowState.dir = (360 + (pan + 180 - panoNorth / panoWidth * 360) ) % 360;

		//パノラマ切替判定・切替(PTViewer部分のみの変更)
		checkChangePanorama(nowState);
		
		//地図更新(地図部分のみの変更)
		updateMap(nowState);
		
		//ボタンを押し続けているなら、続けて移動処理も行う
		if(flag_click_go === true){
			appPTV.startAutoPan(0.0, 0.0, 1.0/1.025);
		}
		else if(flag_click_back === true){
			appPTV.startAutoPan(0.0, 0.0, 1.025);
		}
	}
	
	
	

	
	
	/**
	 *	渡される状態オブジェクトを基にパノラマ画像切替が必要か判断し、必要であれば切り替える
	 *	@param	state
	 */
	function checkChangePanorama(state){
		var range_start;
		var range_end;
		var pano = PCDobj.Panoramas.Panorama[panoidToPanoNumber[state.panoid]];
		var panoid_change,pan_correct,tilt_correct,fov_changeAfter;
		var fov_change;
		var backdir = (state.dir + 180) % 360;
		
		//近傍情報を基にパノラマ切替が必要か判断し、必要であれば切替を行う
		for(var i=0; i < pano.chpanos.chpano.length; i++){
			range_start = parseFloat(pano.chpanos.chpano[i].range.start);
			range_end = parseFloat(pano.chpanos.chpano[i].range.end);
			fov_change = parseFloat(pano.chpanos.chpano[i].fov.base);
			
			if(range_start <= range_end){  //0度をまたがないとき
				//前進切替判断
				if( range_start <= state.dir && state.dir <= range_end){  //切替範囲内にあるとき
					//今のfovが切替視野角より大きいとき、パノラマ画像を切り替える(前進)
					if( state.fov < fov_change){
						//前進切替
						goChangePano(state,pano.chpanos.chpano[i]);
						return;
					}
				}
				//後退切替判断
				if(range_start <= backdir && backdir <= range_end){
					if(state.fov > fov_preChange){  //fov_preChangeはPCDに後退切替用の切替視野角を設け、それに置き換えたい
						//後退切替
						backChangePano(state,pano.chpanos.chpano[i]);
						return;
					}
				}
			}
			//0度をまたぐとき
			else if(range_start > range_end){
				//前進切替判断
				if( state.dir <= range_end || range_start <= state.dir){
					//今のfovが切替視野角より大きいとき、パノラマ画像を切り替える(前進)
					if( state.fov < fov_change){
						//前進切替
						goChangePano(state,pano.chpanos.chpano[i]);
						return;
					}
				}
				//後退切替判断
				if(backdir <= range_end || range_start <= backdir){
					if(state.fov > fov_preChange){  //fov_preChangeはPCDに後退切替用の切替視野角を設け、それに置き換えたい
						//後退切替
						backChangePano(state,pano.chpanos.chpano[i]);
						return;
					}
				}
			}
		}
	}
	
	
	
	/**
	 *	状態オブジェクト、近傍情報オブジェクトを基にパノラマ切替(前進)に必要なパラメータを取得し、切り替える
	 *	@param	state	状態オブジェクト
	 *	@param	obj_chpano	近傍情報オブジェクト  ex. PCDobj.Panoramas.Panorama[N].chpanos.chpano[M]
	 */
	function goChangePano(state , obj_chpano){
		//パノラマ画像切替パラメータ取得
		var panoid_change = obj_chpano.panoid;
		//pan_change = 現在のパン角 - 北のパン角(切替前) + 北のパン角(切替後) - 補正
		var pan_change = state.pan  - panImageNorth(state.panoid) + panImageNorth(panoid_change)  - parseFloat(obj_chpano.correct.pan);
		var tilt_change = state.tilt - parseFloat(obj_chpano.correct.tilt);
		var fov_change = parseFloat(obj_chpano.fov.next);  //切替後視野角取得
		
		//パノラマ切替(PTViewer)
		fov_preChange = obj_chpano.fov.next;  ////////強引後退切替用処理
		changePanoramaPTV(panoid_change,pan_change,tilt_change,fov_change);
	}
	
	
	
	/**
	 *	状態オブジェクト、近傍情報オブジェクトを基にパノラマ切替(後退)に必要なパラメータを取得し、切り替える
	 *	@param	state	状態オブジェクト
	 *	@param	obj_chpano	近傍情報オブジェクト  ex. PCDobj.Panoramas.Panorama[N].chpanos.chpano[M]
	 */	
	function backChangePano(state , obj_chpano){
		//パノラマ画像切替パラメータ取得
		var panoid_changeBack = obj_chpano.panoid;
		//pan_changeBack = 現在のパン角 - 北のパン角(切替前) + 北のパン角(切替後) - 補正
		var pan_changeBack = state.pan  - panImageNorth(state.panoid) + panImageNorth(panoid_changeBack)  - parseFloat(obj_chpano.correct.pan);
		var tilt_changeBack = state.tilt - parseFloat(obj_chpano.correct.tilt);

		
		////////強引後退切替用処理(現状のPCDからは後退切替時の切替後視野角を取得できないため、無理やり設定する手段)
		//後退切替後のpanoidから、今のパノラマへの切替視野角を調査
		var fov_changeBack = -1;
		var pano_back = PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid_changeBack]];
		for(var i=0; i < pano_back.chpanos.chpano.length; i++){
			if(pano_back.chpanos.chpano[i].panoid === state.panoid){
				fov_changeBack = parseFloat(pano_back.chpanos.chpano[i].fov.base);
				fov_preChange = parseFloat(pano_back.chpanos.chpano[i].fov.next);
			}
		}
		//後退切替パノラマから現在のパノラマへの切替がないとき、切換視野角がわからないため、適当な値を与える
		if( fov_changeBack === -1){
			fov_changeBack = 100;
			fov_preChange = 105;
		}
		////////
		
		//パノラマ切替(PTViewer)
		changePanoramaPTV(panoid_changeBack,pan_changeBack,tilt_changeBack,fov_changeBack);	
	}
	
	
	/**
	 *	与えられたパラメータに従ってPTViewerを更新し、パノラマ画像を切り替える(ホットスポット追加も行う)
	 *	@param	panoid	切り替えるパノラマ画像id
	 *	@param	pan		切り替えるpan角
	 *	@param	tilt	切り替えるtilt角
	 *	@param	fov		切り替えるfov
	 */
	function changePanoramaPTV(panoid,pan,tilt,fov){		
		//現在値更新
		nowState.panoid = panoid;
		nowState.pan = pan;
		nowState.tilt = tilt;
		nowState.fov = fov;
		var panoWidth = parseInt(PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid]].img.width);
		var panoNorth = parseInt(PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid]].direction.north);
		nowState.dir = (360 + (pan + 180 - panoNorth / panoWidth * 360) ) % 360;
		
		//PTViewerに渡すパノラマ指定用文字列作成
		var str = "param name=" + panoid + " value = ";
		str += "{getview=getview}";
		str += "{file=" + BasePath + PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid]].img.src + "}";
		str += "{fovmax=" + FovMax + "}";
		str += "{fovmin=" + FovMin + "}";
		//hotspot作成
		str += stringHotspot(panoid);
		
		//PTViewer切替
		appPTV.newPano(str,pan,tilt,fov);
	}
	
	
	/**
	 *	PTViewerに渡す文字列のホットスポット部分を作成する
	 *	@param	panoid	panoid
	 *	@return	文字列
	 */
	function stringHotspot(panoid){
		var str = "";
		if(panoidToContents[panoid].contents.length){
			for(var i=0; i < panoidToContents[panoid].contents.length; i++){
				str += "{hotspot" + i + "=" + panoidToContents[panoid].contents[i] + "}";
			}
		}	
		return str;
	}
	
	
	/**
	 *	現在値に従って、地図を更新する
	 *	@param state	現在値オブジェクト
	 */
	function updateMap(state){
		//緯度・経度 取得
		var lat_marker = parseFloat(PCDobj.Panoramas.Panorama[panoidToPanoNumber[state.panoid]].coords.lat);
		var lng_marker = parseFloat(PCDobj.Panoramas.Panorama[panoidToPanoNumber[state.panoid]].coords.lng);
		
		//地図更新(視野角だけの変更のとき　と　パノラマ切替のとき　とに場合分けして処理する)
		//パノラマ切替がなく、方位・視野角の変更のみのとき
		if(nowState.panoid === panoid_preUpdateMap){
			//前回の地図更新からの差分を求める
			var diff_dir = state.dir - dir_preUpdateMap;
			var diff_fov = state.fov - fov_preUpdateMap;
			//差分が一定値以上のときのみ、視野角の表示変更を行う(opuMapのようにgoogleMapに地図を配置して使うとこの辺の処理で重くなるので、ちょっと軽くする)
			if( Math.abs(diff_dir)>5 || Math.abs(diff_fov)>5 ){
				map_fov(lat_marker,lng_marker,nowState.dir,nowState.fov);
				//地図更新用パラメータ更新
				dir_preUpdateMap = state.dir;
				fov_preUpdateMap = state.fov;
			}
		}
		//パノラマ切替があったとき
		else{
			moveMarker(centerMarker,lat_marker,lng_marker);
			goCenter(lat_marker,lng_marker);
			map_fov(lat_marker,lng_marker,nowState.dir,nowState.fov);
			
			//地図更新用パラメータ更新
			panoid_preUpdateMap = state.panoid;
			dir_preUpdateMap = state.dir;
			fov_preUpdateMap = state.fov;
		}
	}
	
	
	/**
	 *	地図上に視野角を表示する
	 *	@param	lat	現在地の緯度
	 *	@param	lng	現在地の経度
	 *	@param 	dir	現在向いている方位
	 *	@param	fov	現在の視野角
	 */
	function map_fov(lat,lng,dir,fov){
		var lineLength = 50;  //ラインの長さ 50m
		var angle = (360 + 90 - dir) % 360;  //方位を角度に変換
		angle = angle * Math.PI / 180;  //角度をラジアンに変換
		fov = fov * Math.PI / 180;  //fovをラジアンに変換
		
		//与えられた方位・視野角でラインを伸ばしたときのx,y成分(その1)
		var lineLength1_x = lineLength * Math.sin(angle + fov/2);
		var lineLength1_y = lineLength * Math.cos(angle + fov/2);		
		//与えられた方位・視野角でラインを伸ばしたときの緯度・経度(その1)
		lat_line1 = lat + lineLength1_x / 6378137 * 180 / Math.PI;
		lng_line1 = lng + lineLength1_y / 6378137 / Math.cos(lat * Math.PI / 180) * 180 / Math.PI;		

		//与えられた方位・視野角でラインを伸ばしたときのx,y成分(その2)
		var lineLength2_x = lineLength * Math.sin(angle - fov/2);
		var lineLength2_y = lineLength * Math.cos(angle - fov/2);
		//与えられた方位・視野角でラインを伸ばしたときの緯度・経度(その2)
		lat_line2 = lat + lineLength2_x / 6378137 * 180 / Math.PI;
		lng_line2 = lng + lineLength2_y / 6378137 / Math.cos(lat * Math.PI / 180) * 180 / Math.PI;
		
		removeObject(lineObj);
		lineObj = addLine(lat_line1,lng_line1,lat,lng,lat_line2,lng_line2);
	}
	
	
	
//操作系
	function DoAuto(){
		appPTV.startAutoPan( 0.5, 0.0, 1.0 );
	}
	function DoUp(){
		appPTV.startAutoPan( 0.0, 1.0, 1.0 );
	}
	
	function DoDown(){
		appPTV.startAutoPan( 0.0, -1.0, 1.0 );
	}
	function DoLeft(){
		appPTV.startAutoPan( -3.0, 0.0, 1.0 );
	}
	function DoRight(){
		appPTV.startAutoPan( 3.0, 0.0, 1.0 );
	}
	function DoLeftAuto(){
		appPTV.startAutoPan( -1.0, 0.0, 1.0 );
	}
	function DoRightAuto(){
		appPTV.startAutoPan( 1.0, 0.0, 1.0 );
	}
	function DoZoomIn(){
		flag_click_go = true;
		appPTV.startAutoPan( 0.0, 0.0, 1.0/1.025 );
	}
	function DoZoomOut(){
		flag_click_back = true;
		appPTV.startAutoPan( 0.0, 0.0, 1.025 );
	}
	function DoStop(){
		flag_click_go = false;
		flag_click_back = false;
		appPTV.stopAutoPan();
	}
	function Level(){
		nowState.tilt = 0;
		appPTV.gotoView(nowState.pan,nowState.tilt,nowState.fov);
	}



	// コンテンツマーカークリック時の動作
	function markerAction(i){
		contentWindow(i);
	}
	
	/**
	 *	左側のコンテンツ一覧リストでコンテンツを選択肢、コンテンツの近くへ移動ボタンをクリックしたとき
	 *	@param	num	
	 */
	function gotoContent(num){
		if(num == -1){
			num = document.content.contentlist.selectedIndex;
		}
		if(num != -1){
			//コンテンツの緯度・経度取得
			var lat_content = parseFloat(CCDobj.Contents.Content[num].coords.lat);
			var lng_content = parseFloat(CCDobj.Contents.Content[num].coords.lng);
			
			//コンテンツに一番近いパノラマを求め、そのパノラマの緯度・経度を取得
			var panoid = nearPanoid(lat_content,lng_content);
			var lat_pano = parseFloat(PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid]].coords.lat);
			var lng_pano = parseFloat(PCDobj.Panoramas.Panorama[panoidToPanoNumber[panoid]].coords.lng);
			
			
			//パノラマからコンテンツへの方位を求める
			var dir = direction(lat_pano,lng_pano,lat_content,lng_content);
			
			//方位からパノラマ画像におけるパン角に変換
			var pan_north = panImageNorth(panoid);  //パノラマ画像における北の位置のパン角
			var pan = ((pan_north + 180 + dir) % 360 ) - 180;
			
			//パノラマ切替
			changePanoramaPTV(panoid, pan, 0, startfov);
		}
	}
	
	
	/**
	 *	与えられた緯度・経度から、別の与えられた緯度・経度への方位を求める
	 *	@param 	lat_base	基準の緯度[float]
	 *	@param	lng_base	基準の経度[float]
	 *	@param	lat_target	目標の緯度[float]
	 *	@param	lng_target	目標の経度[float]
	 *	@return	方位[int]
	 */
	function direction(lat_base,lng_base,lat_target,lng_target){
		//緯度・経度をラジアンに変換
		lat_base = lat_base * Math.PI / 180;
		lng_base = lng_base * Math.PI / 180;
		lat_target = lat_target * Math.PI / 180;
		lng_target = lng_target * Math.PI / 180;
		
		var dx = 6378137 * (lng_target - lng_base) * Math.cos(lat_base);
		var dy = 6378137 * (lat_target - lat_base);
		var angle = Math.atan2(dy,dx);
		angle = angle * 180 / Math.PI;  //ラジアンを度に変換
		var dir = (360 - angle + 90) % 360;  //角度を方位に変換
		
		return dir;
	}
	
	
	/**
	 *	与えられた緯度・経度に最も近いパノラマ画像のid(panoid)を求める
	 *	コンテンツの有効範囲(特に方位)を考慮していないため、修正が必要か?!
	 *	@param	lat	緯度[float]
	 *	@param	lng	経度[float]
	 *	@return	panoid[string]
	 */
	function nearPanoid(lat,lng){
		var lat_pano,lng_pano;
		var diff_lat,diff_lng,dist_temp;  
		var dist_near,panoid_near;  //最も近いパノラマとの距離とid(距離は実際の値ではないので注意)
		
		//dist_near , panoid_nearの初期設定
		lat_pano = parseFloat(PCDobj.Panoramas.Panorama[0].coords.lat);
		lng_pano = parseFloat(PCDobj.Panoramas.Panorama[0].coords.lng);
		diff_lat = lat - lat_pano;
		diff_lng = lng - lng_pano;
		dist_near = diff_lat * diff_lat + diff_lng * diff_lng;
		panoid_near = PCDobj.Panoramas.Panorama[0].panoid;
		
		//全てのパノラマに対して、与えられた緯度・経度との距離を計算し、最も近いものを求める
		for(var i=1; i<PCDobj.Panoramas.Panorama.length; i++){
			lat_pano = parseFloat(PCDobj.Panoramas.Panorama[i].coords.lat);
			lng_pano = parseFloat(PCDobj.Panoramas.Panorama[i].coords.lng);
			diff_lat = lat - lat_pano;
			diff_lng = lng - lng_pano;
			dist_temp = diff_lat * diff_lat + diff_lng * diff_lng;
			
			if(dist_temp < dist_near){
				panoid_near = PCDobj.Panoramas.Panorama[i].panoid;
				dist_near = dist_temp;
			}
		}
		return panoid_near;
	}
	
	
	
	// コンテンツの詳細表示
	function contentWindow(num){
		var template = "<html><head><title>詳細情報</title><link rel=stylesheet type=text/css href=style.css title=Type1 /></head><body>";
		template += "<center><div id=html></div></center></body></html>";
		var newWin = window.open("","newWin","width=520, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=no");
		newWin.document.write(template);
		var html = "<table width=500><tr><td align=center><b>" + CCDobj.Contents.Content[num].detail.name + "</b><br />";
		html += "<a href=" + ContentBasePath + CCDobj.Contents.Content[num].img.src + " target=_blank>";
		html += "<img src=" + ContentBasePath + CCDobj.Contents.Content[num].img.thumbsrc + " border=0></a><br /><br /><br />";
		html += CCDobj.Contents.Content[num].coment + "</td></tr></table>";
		newWin.document.getElementById("html").innerHTML = html;
		newWin.focus();
	}
	
	
	
	// コンテンツの一覧表示
	function contentIchiran(){
		if(exist_CCD === false){
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
				html += "<a href=" + ContentBasePath + CCDobj.Contents.Content[i].img.src + " target=_blank>";
				html += "<img src=" + ContentBasePath + CCDobj.Contents.Content[i].img.thumbsrc + " border=0></a>";
			}
			html += "</td><td><b>" + CCDobj.Contents.Content[i].detail.name + "</b><br /><br />";
			html += "<a href=javascript:opener.contentWindow(" + i + ");>詳しい情報を表示</a><br /><a href=javascript:opener.gotoContent(" + i + ");>ここへ移動</a></td></tr>";
		}
		html += "</table></center>";
		newWin2.document.getElementById("html").innerHTML = html;
		newWin2.focus();
	}
	
	
	
	