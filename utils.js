var moment = require('moment');
var _ = require('lodash');
const DATE_STRING = 'YYYY-MM-DDTHH:mm:ss.000\\Z';

function translateLap (lap, timeToMoveBy, distanceToStartAt = 0) {
  lap.$.StartTime = moveTimeBy(lap.$.StartTime, timeToMoveBy);
  lap.Track[0].Trackpoint.map(Trackpoint => {
    Trackpoint.Time[0] = moveTimeBy(Trackpoint.Time[0], timeToMoveBy);
    Trackpoint.DistanceMeters[0] = String(parseFloat(Trackpoint.DistanceMeters[0]) + distanceToStartAt);
    delete Trackpoint.Extensions;
  });
  return lap
}

function moveTimeBy(timeString, amountToIncreaseBy) {
  var date = moment.utc(timeString, DATE_STRING);
  date.add(amountToIncreaseBy);

  return date.utc().format(DATE_STRING);
}

function scaleLap(lap, millisecondsForDuration) {
  var startTime = moment.utc(lap.$.StartTime, DATE_STRING);
  var initialDuration = moment.utc(_.last(lap.Track[0].Trackpoint).Time[0], DATE_STRING).diff(startTime);
  lap.TotalTimeSeconds[0] = String(millisecondsForDuration) + '.0';
  var scaleFactor = (millisecondsForDuration - 1000) / initialDuration;

  lap.Track[0].Trackpoint.map(Trackpoint => {
    Trackpoint.Time[0] = scaleTimeBy(Trackpoint.Time[0], startTime, scaleFactor, millisecondsForDuration);
  });

  return lap;
}

function scaleTimeBy (timeString, startTime, scaleFactor, maximumDifferenceMilliseconds) {
  var date = moment.utc(timeString, DATE_STRING);
  var initialDiff = date.diff(startTime);
  var newTime = startTime.clone().add(initialDiff * scaleFactor);
  return newTime.utc().format(DATE_STRING);
}

module.exports = {
  translateLap,
  moveTimeBy,
  scaleLap,
  scaleTimeBy,
  DATE_STRING
};
