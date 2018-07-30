var moment = require('moment');
const DATE_STRING = 'YYYY-MM-DDTHH:mm:ss.000\\Z';

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

module.exports = {
  translateLap,
  moveTimeBy,
  scaleLap,
  scaleTimeBy,
  DATE_STRING
};
