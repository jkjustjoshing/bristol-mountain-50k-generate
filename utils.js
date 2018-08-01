var moment = require('moment');
var _ = require('lodash');
const DATE_STRING = 'YYYY-MM-DDTHH:mm:ss.000\\Z';

function translateLap (lap, timeToMoveByOrToStartAt, distanceToStartAt = 0) {
  var firstTimePoint = moment.utc(_.first(lap.Track[0].Trackpoint).Time[0], DATE_STRING);

  var timeToMoveBy;
  if (moment.isMoment(timeToMoveByOrToStartAt)) {
    timeToMoveBy = timeToMoveByOrToStartAt.diff(firstTimePoint);
  } else {
    timeToMoveBy = timeToMoveByOrToStartAt;
  }

  lap.$.StartTime = moveTimeBy(firstTimePoint, timeToMoveBy);
  lap.Track[0].Trackpoint.map(Trackpoint => {
    Trackpoint.Time[0] = moveTimeBy(Trackpoint.Time[0], timeToMoveBy);
    Trackpoint.DistanceMeters[0] = String(parseFloat(Trackpoint.DistanceMeters[0]) + distanceToStartAt);
    delete Trackpoint.Extensions;
  });
  return lap
}

function moveTimeBy(timeStringOrMoment, amountToIncreaseBy) {
  var date = moment.isMoment(timeStringOrMoment) ? timeStringOrMoment : moment.utc(timeStringOrMoment, DATE_STRING);
  date.add(amountToIncreaseBy);

  return date.utc().format(DATE_STRING);
}

function scaleLap(lap, millisecondsForDurationOrDesiredEndTime) {
  var startTime = moment.utc(lap.$.StartTime, DATE_STRING);

  var millisecondsForDuration;
  if (moment.isMoment(millisecondsForDurationOrDesiredEndTime)) {
    millisecondsForDuration = millisecondsForDurationOrDesiredEndTime.diff(startTime);
  } else {
    millisecondsForDuration = millisecondsForDurationOrDesiredEndTime;
  }

  lap.TotalTimeSeconds[0] = String(millisecondsForDuration / 1000) + '.0';
  var scaleFactor = getScaleFactor(startTime, moment.utc(_.last(lap.Track[0].Trackpoint).Time[0], DATE_STRING), millisecondsForDuration);

  lap.Track[0].Trackpoint.map(Trackpoint => {
    Trackpoint.Time[0] = scaleTimeBy(Trackpoint.Time[0], startTime, scaleFactor);
  });

  return lap;
}

function scaleTimeBy (timeString, startTime, scaleFactor) {
  var date = moment.utc(timeString, DATE_STRING);
  var initialDiff = date.diff(startTime);
  var newTime = startTime.clone().add(initialDiff * scaleFactor);
  return newTime.utc().format(DATE_STRING);
}

function getScaleFactor(startTime, currentEnd, newEndOrDuration) {
  var initialDuration = currentEnd.diff(startTime);
  var desiredDuration = moment.isMoment(newEndOrDuration) ? newEndOrDuration.diff(startTime) : newEndOrDuration;
  return (desiredDuration - 1000) / initialDuration;
}

function pinLap (lap, timeToPin, coordinates) {
  //  - Find time, += 45 minutes
  //  - For each point, find the minimum pythagorean
  //  - Assign correct time to that point
  //  - Split into a lap at that point
  //  - Scale the 1st half lap correctly based on start time
  //  - Scale the 2nd half correctly based on end time

  var trackpoints = lap.Track[0].Trackpoint;

  var timeAndCoordinates = trackpoints
    .filter(trackpoint => Math.abs(moment.utc(trackpoint.Time[0], DATE_STRING).diff(timeToPin)) < 45*60*1000)
    .map((trackpoint, index) => {
      var latitude = parseFloat(trackpoint.Position[0].LatitudeDegrees[0]);
      var longitude = parseFloat(trackpoint.Position[0].LongitudeDegrees[0]);
      return {
        coordinates: [latitude, longitude],
        time: moment.utc(trackpoint.Time[0], DATE_STRING),
        distance: Math.sqrt(Math.pow(coordinates[0] - latitude, 2) + Math.pow(coordinates[1] - longitude, 2)),
        trackpoint,
        index
      };
    });
    var min = _.minBy(timeAndCoordinates, 'distance');
    var index = trackpoints.indexOf(min.trackpoint);
    console.log('time to pin', timeToPin.format(), index)

  // Split into a lap at this point
  var lap2 = _.cloneDeep(lap);
  lap.Track[0].Trackpoint = lap.Track[0].Trackpoint.slice(0,index);
  lap = scaleLap(lap, timeToPin);

  lap2.Track[0].Trackpoint = lap2.Track[0].Trackpoint.slice(index);

  var lap2End = moment.utc(_.last(lap2.Track[0].Trackpoint).Time[0], DATE_STRING);
  lap2 = translateLap(lap2, timeToPin);
  lap2 = scaleLap(lap2, lap2End);
  return [lap, lap2];
}

module.exports = {
  translateLap,
  moveTimeBy,
  scaleLap,
  scaleTimeBy,
  pinLap,
  DATE_STRING
};
