var xml2js = require('xml2js');
var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
const DATE_STRING = 'YYYY-MM-DDTHH:mm:ss.000\\Z';

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

    lap = translateLap(lap, startTimeToTranslate);
    lap = scaleLap(lap, lapDuration);
    return lap;
  });

  var builder = new xml2js.Builder();
  var xml = builder.buildObject(result);

  fs.writeFileSync(`./${fileName}-new.tcx`, xml)
});

function translateActivity (activity, timeToMoveBy) {
  activity.Id[0] = moveTimeBy(activity.Id[0], timeToMoveBy);
  return activity;
}

function translateLap (lap, timeToMoveBy) {
  lap.$.StartTime = moveTimeBy(lap.$.StartTime, timeToMoveBy);
  lap.Track[0].Trackpoint.map(Trackpoint => {
    Trackpoint.Time[0] = moveTimeBy(Trackpoint.Time[0], timeToMoveBy);
    delete Trackpoint.Extensions;
  });
  return lap
}

function moveTimeBy(timeString, amountToIncreaseBy) {
  var date = moment.utc(timeString, DATE_STRING);
  date.add(amountToIncreaseBy);

  return date.utc().format(DATE_STRING);
}

function scaleLap(lap, secondsForDuration) {
  var startTime = moment.utc(lap.$.StartTime, DATE_STRING);
  var initialDuration = parseFloat(lap.TotalTimeSeconds[0]);
  lap.TotalTimeSeconds[0] = String(secondsForDuration) + '.0';

  var scaleFactor = secondsForDuration / initialDuration;
  lap.Track[0].Trackpoint.map(Trackpoint => {
    Trackpoint.Time[0] = scaleTimeBy(Trackpoint.Time[0], startTime, scaleFactor);
  });

  return lap;
}

function scaleTimeBy (timeString, startTime, scaleFactor) {
  var date = moment.utc(timeString, DATE_STRING);
  var initialDiff = date.diff(startTime);

  var newTime = date.add(initialDiff * scaleFactor);

  return newTime.utc().format(DATE_STRING);
}

