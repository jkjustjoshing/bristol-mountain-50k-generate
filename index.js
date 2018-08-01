var xml2js = require('xml2js');
var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
let {
  translateLap,
  moveTimeBy,
  scaleLap,
  pinLap,
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
  var baseLap = translateLap(activityArr[0].Lap[0], startTime);

  activityArr[0].Lap = lapTimes.map((lapDuration, i) => {
    var lap = _.cloneDeep(baseLap);

    var startTimeToTranslate = lapTimes.reduce((runningSum, thisVal, index) => index < i ? runningSum + thisVal : runningSum, 0);

    lap = translateLap(lap, startTimeToTranslate, i * parseFloat(_.last(activityArr[0].Lap[0].Track[0].Trackpoint).DistanceMeters[0]));
    lap = scaleLap(lap, lapDuration);
    return lap;
  });

  // At this point, the activity has been constructed correctly. Now, time to add in:
  //  - stopping at the base aid station (guessing 7 minutes, 10 minutes, 17 minutes)
  //  - Pause at top of gravel - 3:40-3:55pm, rest at top of gravel
  //  - 10:13am, 1st loop top of Valley where it meets the last ascent (42.7466639,-77.4182083)
  //  - 1:48pm: "I just finished the hardest part of the Valley of the spare. 5 minutes until I get to the aid station"
  //  - 2:05pm, just past the summit aid station at the end of lap 2
  //  - 4:11pm, 55% up morning star, 2nd ascent (42.7386278,-77.4171083)
  //  - 5:17pm, split of 10k and 10m loops
  //  - 6:26pm, 45% down Quantum Leap (42.7444056,-77.4148861)
  // Steps to add a "pause"
  //  - Find the time
  //  -
  // Steps to pin a time:
  //  - Find time, += 45 minutes
  //  - For each point, find the minimum pythagorean
  //  - Assign correct time to that point
  //  - Split into a lap at that point
  //  - Scale the 1st half lap correctly based on start time
  //  - Scale the 2nd half correctly based on end time

  // activityArr[0].Lap =[
  //   activityArr[0].Lap[0],
  //   activityArr[0].Lap[1],
  //   ...pinLap(activityArr[0].Lap[2], moment('2018-07-28T16:11', 'YYYY-MM-DDTHH:mm').utc(), [42.740440, -77.406995])//[42.7386278,-77.4171083])
  // ];

  var builder = new xml2js.Builder();
  var xml = builder.buildObject(result);

  fs.writeFileSync(`./${fileName}-new.tcx`, xml)
});

function translateActivity (activity, timeToMoveBy) {
  activity.Id[0] = moveTimeBy(activity.Id[0], timeToMoveBy);
  return activity;
}
