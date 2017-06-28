var ob_lon = -55.7;
var ob_lat = -41.63;
var ob_np_ang = 8.4892


var posx = 0.93*Math.cos(ob_lat*3.14/180)*Math.cos(ob_lon*3.14/180);
var posy = 0.93*Math.cos(ob_lat*3.14/180)*Math.sin(ob_lon*3.14/180);
var posz = 0.93*Math.sin(ob_lat*3.14/180);

console.log(posx,posy,posz);
