var xml2js = require('xml2js');
var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
let {
  translateLap,
  moveTimeBy,
  scaleLap,
  scaleTimeBy,
  DATE_STRING
} = require('./utils');

// var fileName = 'irondequoit';
var fileName = 'activity';

var startTime = moment('2018-07-28T08', 'YYYY-MM-DDTHH').utc();

var file = fs.readFileSync(`./${fileName}.tcx`, 'utf8');

xml2js.parseString(file, function (err, result) {

  var lapTimes = [
    '02:59:26',
    '03:46:18',
    '04:05:28'
  ].map(time => time
      .split(':')
      .map(str => parseInt(str, 10))
      .map((num, index) => num * Math.pow(60, (2-index)))
      .reduce((a,b) => a + b) * 1000
  );

  var activityArr = result.TrainingCenterDatabase.Activities[0].Activity;
  var activityStartTime = moment.utc(activityArr[0].Id[0], DATE_STRING);
  var timeToMoveBy = startTime.diff(activityStartTime); // add this to each time
  activityArr[0] = translateActivity(activityArr[0], timeToMoveBy);
  var baseLap = translateLap(activityArr[0].Lap[0], timeToMoveBy);

  activityArr[0].Lap = lapTimes.map((lapDuration, i) => {
    var lap = _.cloneDeep(baseLap);

    var startTimeToTranslate = lapTimes.reduce((runningSum, thisVal, index) => index < i ? runningSum + thisVal : runningSum, 0);

    lap = translateLap(lap, startTimeToTranslate, i * parseFloat(_.last(activityArr[0].Lap[0].Track[0].Trackpoint).DistanceMeters[0]));
    lap = scaleLap(lap, lapDuration);
    return lap;
  });

  // At this point, the activity has been constructed correctly

  var builder = new xml2js.Builder();
  var xml = builder.buildObject(result);

  fs.writeFileSync(`./${fileName}-new.tcx`, xml)
});

function translateActivity (activity, timeToMoveBy) {
  activity.Id[0] = moveTimeBy(activity.Id[0], timeToMoveBy);
  return activity;
}
