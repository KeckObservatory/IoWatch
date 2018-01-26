var fs = require('fs');
var request = require('request');
const port = 8080;

// testing distribution on VM
var express = require("express");
const serv = express()
  .use(express.static(__dirname))
  .get("/", (req,res) => res.sendFile(__dirname+'/io-map.html') )
  .listen(port, () => console.log('Server started on '+port+'!'));

var io = require('socket.io')(serv);

const PATH_TO_DATA_MAP = './reduced/Io/';

// io as in an interface... not the moon... this is a tragedy
io.sockets.on('connection', function (socket) {
	console.log("Client connected");
	socket.emit('connect');

	socket.on('disconnect', function () {
	  	console.log('Client disconnect');
	});

	socket.on('dates', function(){
		// console.log('dates');

		fs.readdir(PATH_TO_DATA_MAP, (err, files) => {
			// console.log(files);
			var dates = new Set();
		    files.forEach(file => {
		    	try {
	    			var t = file.toString().match(/(\d+)(\D+)(\d+)/);
	    			// console.log(t)

	    			if (t != null) {
		    			// console.log(t)
		    			var month = (['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(t[2])+1).toString();
						if (month.length != 2) {
							month = "0"+month;
						}
						var day = t[3];
						if (day.length != 2) {
							day = "0"+day;
						}
						var year = t[1];
		    			dates.add(month+"-"+day+"-"+year);
		    		}

			    }

			    catch(err) {
			    	console.log(err);
			    }
		    })

		    // console.log(dates)
		    socket.emit("dates", Array.from(dates));

		});
	});

	socket.on('data', function(_date)
	{
		// console.log(_date);

		var date = _date.split("-");
		var month = (['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'])[parseInt(date[1])-1];
		var day = parseInt(date[2].slice(0,2)).toString();
		if(day.length == 1) {
			day = "0"+day;
		}
		var year = date[0]

		var filepaths = [];
		regex = /\_(?:BrA|BrAc|h2o|Kc|Lp|Ms|PAH)\_(\d\d)(\d\d)UT\./;
		// console.log(regex);
		var dir = PATH_TO_DATA_MAP+year+month+day+"/";
		console.log(dir);

		// TO DO: folder name of date
		fs.readdir(dir, (err, files) => {
			// console.log(files);

		    files.forEach(F => {
		    	var file = F.toString();
		    	var fml = file.match(regex);
		    	// console.log("iterating", fml);
		        if (fml != null) {
		            console.log(file);
		            filepaths.push(file);
		        }
		        // else {
		        // 	console.log(file);
		        // }
		    })


		    try {

		    	/*
	            Methods for querying the JPL Horizons database.

	            Instructions for keyowrds and options available here:
	            ftp://ssd.jpl.nasa.gov/pub/ssd/horizons_batch_example.long

	            Adapted from:
	            v0: M. Adamkovics
	            v1: K. de Kleer

			    input name of taret as string, e.g. 'Io', and date in the format:
			    '\'YYYY-MM-DD HH:MM\''
			    For example: data=get_ephem.get_ephemerides('Io','\'2017-06-09 08:24\'')
			    Returns a list containing (in string format):
			    UTdate,UTtime,sun,moon,RA (J2000),DEC (J2000),Airmass,Extinction,Ang-Diam("),Ob-lon,Ob-lat,NP.ang,NP.dist
			    */

			    var code = {'Mercury':'199', 'Venus':'299', 'Earth':'399', 'Mars':'499',
			        'Jupiter':'599', 'Io':'501', 'Europa':'502', 'Ganymede':'503',
			        'Saturn':'699', 'Uranus':'799', 'Neptune':'899','Callisto':'504'};
			    var target = "Io";


				var t = filepaths[0].match(/.+_(\d\d)(\d\d)/);

				month = (['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(month)+1);

				var Min = t[2];
				if (Min.length == 1){ Min = "0"+Min; }
				var Hour = (parseInt(t[1])).toString();
				if (Hour.length == 1){ Hour = "0"+Hour; }

				var tstart_UT = ["'",year,"-",
							month,"-",
							day," ",
							Hour,":",Min,"'"].join("");

				var DiM = 0;

				if (month == 2) { if (parseInt(year)%4 != 0) {DiM = 28;} else {DiM=29;} }
				else if (month == 4 || month == 6 || month == 9 || month == 11) {DiM = 30;}
				else /*if (month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 || month == 12)*/ {DiM = 31;}

				var Dt = day+1;
				if (Dt > DiM) {
					month += 1;
					Dt = 1;
					if (month > 12) {
						year += 1;
						month = 1;
					}
				}

				var tend_UT = ["'",year,"-",
							month,"-",
							Dt," ",
							Hour,":",Min,"'"].join("");

			    var geturl =   ["http://ssd.jpl.nasa.gov/horizons_batch.cgi?batch=1",
			    			"&MAKE_EPHEM='YES'&TABLE_TYPE='OBSERVER'",
			    			"&COMMAND=", code[ target ],
			    			"&CENTER='568'", //568 = mauna kea
			    			"&START_TIME=",tstart_UT,
			    			"&STOP_TIME=",tend_UT,
			    			"&STEP_SIZE='1 day'",
			    			"&QUANTITIES='1,8,13,14,17'",
			    			"&CSV_FORMAT='YES'"].join("");

			    // console.log(geturl);

			    var ephem = null;
			   	// request stuff. just do it once, to save time and whatever.
			   	request({uri: geturl,}, function(error, response, body) {
						try {
							ephem = body.toString();
							// console.log(ephem);
							var results = (ephem.match(/\$\$SOE\n\s(.*)\,\n/)[1]).split(',');

							var data = {directory: dir,
							 files: filepaths,
							 location: results};

							// console.log(data);
							io.emit('data',data);
						}
						catch (err) {
							console.log("threw error",err);
							console.log("url: ",geturl);
						}
				});
			}

			catch(err) {
				console.log("No data for that day. (threw ",err,")");
			}

		});

	});

});
