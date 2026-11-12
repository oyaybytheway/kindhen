/* Hen express-upcharge rates.
   USPS Priority Mail Commercial, Notice 123, effective October 4, 2026
   (https://pe.usps.com/Text/DMM300/Notice123.htm and
    https://www.usps.com/business/prices/2026/s-pm-com.csv).
   ZIP-to-zone chart: USPS Domestic Zone Chart for origin 331 (Miami, FL),
   effective November 1, 2026, fetched November 12, 2026.
   These figures are used only to compute a customer-paid express upcharge.
   Standard shipping stays included in the product price — Hen covers that. */
window.HEN_EXPRESS = (function(){
  var RATES = {"1":[0,9.44,9.72,10.11,10.8,13.82,15.32,15.93,16.07,33.33],"2":[0,9.5,9.79,10.18,11.19,14.02,16.19,17.16,17.22,35.79],"3":[0,9.85,10.11,11.15,13.08,17.41,19.71,21.36,21.42,44.76],"4":[0,11.62,11.87,13.17,15.61,21.63,26.26,28.51,28.57,58.98],"5":[0,12.04,12.21,13.67,16.37,23.27,28.1,30.85,30.93,64.02]};
  var RANGES = [[5,34,6],[35,35,7],[36,42,6],[43,44,7],[45,45,6],[46,49,7],[50,81,6],[82,84,5],[85,152,6],[153,155,5],[156,171,6],[172,173,5],[174,196,6],[197,197,5],[198,198,6],[199,212,5],[214,268,5],[270,289,5],[290,292,4],[293,293,5],[294,295,4],[296,297,5],[298,299,4],[300,301,5],[302,304,4],[305,305,5],[306,306,4],[307,307,5],[308,320,4],[321,321,3],[322,325,4],[326,329,3],[330,330,2],[331,333,1],[334,334,2],[335,338,3],[339,339,2],[340,340,1],[341,341,2],[342,342,3],[344,344,3],[346,347,3],[349,349,2],[350,352,5],[354,359,5],[360,361,4],[362,362,5],[363,364,4],[365,365,5],[366,366,4],[367,367,5],[368,368,4],[369,397,5],[398,399,4],[400,418,5],[420,427,5],[430,430,6],[431,432,5],[433,436,6],[437,437,5],[438,438,6],[439,439,5],[440,449,6],[450,452,5],[453,453,6],[454,457,5],[458,458,6],[459,459,5],[460,469,6],[470,472,5],[473,473,6],[474,477,5],[478,497,6],[498,499,7],[500,503,6],[504,505,7],[506,509,6],[510,514,7],[515,516,6],[520,528,6],[530,532,6],[534,535,6],[537,539,6],[540,541,7],[542,543,6],[544,545,7],[546,546,6],[547,548,7],[549,549,6],[550,551,7],[553,567,7],[570,576,7],[577,577,8],[580,581,7],[582,583,8],[584,584,7],[585,588,8],[590,599,8],[600,620,6],[622,627,6],[628,629,5],[630,631,6],[633,636,6],[637,639,5],[640,641,6],[644,658,6],[660,662,6],[664,675,6],[676,680,7],[681,681,6],[683,683,6],[684,684,7],[685,685,6],[686,693,7],[700,701,5],[703,708,5],[710,714,5],[716,725,5],[726,731,6],[733,738,6],[739,739,7],[740,741,6],[743,754,6],[755,756,5],[757,758,6],[759,759,5],[760,769,6],[770,770,5],[772,777,5],[778,789,6],[790,791,7],[792,797,6],[798,812,7],[813,816,8],[820,820,7],[821,821,8],[822,822,7],[823,838,8],[840,847,8],[850,853,8],[855,857,8],[859,860,8],[863,865,8],[870,871,7],[873,873,8],[874,885,7],[889,891,8],[893,895,8],[897,898,8],[900,908,8],[910,928,8],[930,966,8],[968,968,8],[969,969,9],[970,986,8],[988,999,8]];
  var FIVE = [[96700,96700,8],[9000,9999,6],[96200,96699,6],[96900,96938,8],[96945,96959,8],[96961,96969,8],[96971,96999,8],[96701,96799,8]];

  function digits(zip){
    return String(zip||"").replace(/\D/g,"").slice(0,5);
  }
  function miamiZone(zip){
    var z = digits(zip);
    if(z.length!==5) return null;
    var n = parseInt(z,10);
    for(var i=0;i<FIVE.length;i++){
      if(n>=FIVE[i][0] && n<=FIVE[i][1]) return FIVE[i][2];
    }
    var p = parseInt(z.slice(0,3),10);
    for(var j=0;j<RANGES.length;j++){
      if(p>=RANGES[j][0] && p<=RANGES[j][1]) return RANGES[j][2];
    }
    return null;
  }
  function zoneFor(zip, origin){
    var z = miamiZone(zip);
    if(z==null) return null;
    // Until a US warehouse city is confirmed, quote the longer of zone 8
    // (farthest lower 48) and the Miami-chart zone, so we don't come up short.
    // If the real extra is less at checkout, the customer pays the lower amount.
    if(origin==="us-tbd") return Math.max(8, z);
    return z;
  }
  function priorityRate(pounds, zone){
    var lb = Math.max(1, Math.ceil(Number(pounds)||1));
    var keys = Object.keys(RATES).map(Number).sort(function(a,b){return a-b;});
    if(lb>keys[keys.length-1]) lb = keys[keys.length-1];
    var row = RATES[lb];
    if(!row || !row[zone]) return null;
    return row[zone];
  }
  /* Per-unit packages (safer if the fulfiller ships items separately).
     Upcharge = max(0, Priority rate − standard shipping already in the price). */
  function quote(products, cart, zip){
    var d = digits(zip);
    if(d.length!==5) return {ok:false, reason:"zip"};
    var lines = [], total = 0, any = false, skipped = [];
    var ids = Object.keys(cart||{}).filter(function(k){ return products[k] && cart[k]>0; });
    if(!ids.length) return {ok:false, reason:"empty"};
    for(var i=0;i<ids.length;i++){
      var id = ids[i], p = products[id], qty = cart[id], ex = p.express||{};
      if(ex.eligible===false){
        skipped.push({id:id, name:p.name, reason:ex.reason||"unavailable"});
        continue;
      }
      any = true;
      var origin = ex.origin||"miami";
      var zone = zoneFor(d, origin);
      if(zone==null) return {ok:false, reason:"unknown-zip", zip:d};
      var weight = Number(ex.weight)||2;
      var standard = Number(ex.standard)||0;
      var unit = priorityRate(weight, zone);
      if(unit==null) return {ok:false, reason:"rate"};
      var extra = Math.max(0, Math.round((unit - standard)*100)/100);
      var line = extra * qty;
      total += line;
      lines.push({
        id:id, name:p.name, qty:qty, zone:zone, origin:origin,
        priority:unit, standard:standard, extra:extra, line:Math.round(line*100)/100
      });
    }
    total = Math.round(total*100)/100;
    if(!any) return {ok:true, eligible:false, skipped:skipped, zip:d, total:0, lines:[]};
    return {ok:true, eligible:true, zip:d, total:total, lines:lines, skipped:skipped};
  }
  return {digits:digits, miamiZone:miamiZone, zoneFor:zoneFor, priorityRate:priorityRate, quote:quote};
})();
