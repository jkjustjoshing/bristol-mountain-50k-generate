var xml2js = require('xml2js');
var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
const DATE_STRING = 'YYYY-MM-DDTHH:mm:ss.000\\Z';

// var fileName = 'irondequoit';
var fileName = 'activity';

var startTime = moment(new Date(2018, 6, 28, 8)).add(4, 'hours');

var file = fs.readFileSync(`./${fileName}.tcx`, 'utf8');

xml2js.parseString(file, function (err, result) {


  var activityArr = result.TrainingCenterDatabase.Activities[0].Activity;
  var activityStartTime = moment(activityArr[0].Id[0], DATE_STRING);
  var timeToMoveBy = startTime.diff(activityStartTime); // add this to each time
  activityArr[0] = translateStartTime(activityArr[0], timeToMoveBy);
  activityArr[0].Lap[0] = scaleLap(activityArr[0].Lap[0], (2*3600) + (59*60) + (26));

  var builder = new xml2js.Builder();
  var xml = builder.buildObject(result);

  fs.writeFileSync(`./${fileName}-new.tcx`, xml)
});

function translateStartTime (activity, timeToMoveBy) {
  activity.Id[0] = moveTimeBy(activity.Id[0], timeToMoveBy);
  activity.Lap.map(Lap => {
    Lap.$.StartTime = moveTimeBy(Lap.$.StartTime, timeToMoveBy);
    Lap.Track[0].Trackpoint.map(Trackpoint => {
      Trackpoint.Time[0] = moveTimeBy(Trackpoint.Time[0], timeToMoveBy);
      delete Trackpoint.Extensions;
    });
  });

  // // Append a new lap
  // var nextLap = _.cloneDeep(_.last(activity.Lap));
  // activity.Lap.push(nextLap);

  return activity;
}

function moveTimeBy(timeString, amountToIncreaseBy) {
  var date = moment(timeString, DATE_STRING);
  date.add(amountToIncreaseBy);

  return date.format(DATE_STRING);
}

function scaleLap(lap, secondsForDuration) {
  var startTime = moment(lap.$.StartTime, DATE_STRING);
  var initialDuration = parseFloat(lap.TotalTimeSeconds[0]);
  lap.TotalTimeSeconds[0] = String(secondsForDuration) + '.0';

  var scaleFactor = secondsForDuration / initialDuration;
  lap.Track[0].Trackpoint.map(Trackpoint => {
    Trackpoint.Time[0] = scaleTimeBy(Trackpoint.Time[0], startTime, scaleFactor);
  });

  return lap;
}

function scaleTimeBy (timeString, startTime, scaleFactor) {
  var date = moment(timeString, DATE_STRING);
  var initialDiff = date.diff(startTime);

  var newTime = date.add(initialDiff * scaleFactor);

  return newTime.format(DATE_STRING);
}

