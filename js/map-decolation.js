/*
 * Google Maps 装飾用関数
 */
 
// 県大キャンパスマップの画像を貼り付け
function opuMap(){
	var pointNE = new GLatLng(34.697016895486406, 133.78812432289123);
	var pointSW = new GLatLng(34.68802784236585, 133.77511024475098);
	var groundOverlay = new GGroundOverlay("./image/map_opu.png",new GLatLngBounds(pointSW, pointNE));
	addObject(groundOverlay);
}

// 都羅の小径の撮影経路に青線を引く
function tsuraStreet(){
	var points1 = [
		new GLatLng(34.555385622651954, 133.73541355133057),
		new GLatLng(34.555041016520406, 133.73604118824005),
		new GLatLng(34.55489963923299, 133.73616456985474),
		new GLatLng(34.554826741475296, 133.73631209135055),
		new GLatLng(34.55456607624342, 133.73645693063736),
		new GLatLng(34.5544401613897, 133.73659372329712),
		new GLatLng(34.55423692999574, 133.7366607785225),
		new GLatLng(34.55405578855224, 133.73666882514954),
		new GLatLng(34.55403811619518, 133.7366446852684),
		new GLatLng(34.55360293321803, 133.73645961284637),
		new GLatLng(34.55309043054949, 133.7363362312317),
		new GLatLng(34.55265966077842, 133.73632550239563),
		new GLatLng(34.5528452234148, 133.73764246702194),
		new GLatLng(34.552880568631934, 133.73772025108337),
		new GLatLng(34.55295125902117, 133.73792678117752),
		new GLatLng(34.55298881326602, 133.73806357383728),
		new GLatLng(34.55301753120656, 133.73824059963226),
		new GLatLng(34.5530307856373, 133.73838007450104),
		new GLatLng(34.55303299470888, 133.73849540948868),
		new GLatLng(34.55300869491822, 133.7386617064476),
		new GLatLng(34.5529092866098, 133.7391123175621),
		new GLatLng(34.55289603215972, 133.73925983905792),
		new GLatLng(34.55290486846002, 133.7394744157791),
		new GLatLng(34.55293137735528, 133.7396863102913),
		new GLatLng(34.552955677168505, 133.73979896306991),
		new GLatLng(34.552999858628944, 133.7398847937584),
		new GLatLng(34.553337846025, 133.7401905655861),
		new GLatLng(34.55345271724569, 133.74028712511063),
		new GLatLng(34.553596306048526, 133.74035149812698),
		new GLatLng(34.55375756702393, 133.7403890490532),
		new GLatLng(34.55384592906969, 133.74040514230728),
		new GLatLng(34.55433191864385, 133.74034345149994),
		new GLatLng(34.554764888782316, 133.74075919389725),
		new GLatLng(34.55484441366486, 133.74105423688888)];

	var points2 = [
		new GLatLng(34.555261918051, 133.73563885688782),
		new GLatLng(34.55509845097478, 133.73538672924042),
		new GLatLng(34.5549614918258, 133.73528480529785),
		new GLatLng(34.55482453245134, 133.73526334762573),
		new GLatLng(34.55456607624342, 133.7352767586708),
		new GLatLng(34.55421925767715, 133.7353277206421),
		new GLatLng(34.55374652176162, 133.73531699180603),
		new GLatLng(34.55370454975142, 133.7355074286461),
		new GLatLng(34.55371559501931, 133.73582392930984),
		new GLatLng(34.55371559501931, 133.73597413301468),
		new GLatLng(34.55365595055529, 133.73647570610046)];
		
	var streetLine1 = new GPolyline(points1, "#0000ff", 5, 0.5);
	var streetLine2 = new GPolyline(points2, "#0000ff", 5, 0.5);
	addObject(streetLine1);
	addObject(streetLine2);
}
