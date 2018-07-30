var parseString = require('xml2js').parseString;
var fs = require('fs');

var file = fs.readFileSync('./activity.gpx', 'utf8');

parseString(file, function (err, result) {
  console.log(result);
});
