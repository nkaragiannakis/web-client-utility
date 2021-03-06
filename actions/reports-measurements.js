var _ = require('lodash');
var moment = require('moment');
var sprintf = require('sprintf');
var ActionTypes = require('../action-types');
var {computeKey} = require('../reports').measurements;
var TimeSpan = require('../model/timespan');
var population = require('../model/population');
var {toUtcTime} = require('../helpers/timestamps');
var {queryMeasurements} = require('../service/query');
var favouritesAPI = require('../api/favourites');
var adminAPI = require('../api/admin');

var addFavouriteRequest = function () {
  return {
    type: ActionTypes.reports.measurements.ADD_FAVOURITE_REQUEST
  };
};

var addFavouriteResponse = function (success, errors) {
  return {
    type: ActionTypes.reports.measurements.ADD_FAVOURITE_RESPONSE,
    success: success,
    errors: errors
  };
};

var _saveLayoutResponse = function(success, errors) {
  return {
    type : ActionTypes.reports.measurements.CHARTS_SAVE_LAYOUT_RESPONSE,
    success : success,
    errors : errors
  };
};

var actions = {

  initialize: (field, level, reportName, key, defaults={}) => ({
    type: ActionTypes.reports.measurements.INITIALIZE,
    field,
    level,
    reportName,
    key,
    source: defaults.source,
    timespan: defaults.timespan,
    population: defaults.population,
  }),
  initMultipleQueries : function(field, level, reportName, key, multipleQueries, source) {
    if(source === 'AMPHIRO'){
      source = 'device';
    }
    return{
      type: ActionTypes.reports.measurements.INIT_MULTIPLE,
      field,
      level,
      reportName,
      key,
      source: source ? source : 'meter',      
      multipleQueries: multipleQueries
    };
  },
  requestData: (field, level, reportName, key, t=null) => ({
    type: ActionTypes.reports.measurements.REQUEST_DATA,
    field,
    level,
    reportName,
    key,
    timestamp: (t || new Date()).getTime(),
  }),
  requestMultipleData: (field, level, reportName, key, t=null) => ({
    type: ActionTypes.reports.measurements.REQUEST_MULTIPLE_DATA,
    field,
    level,
    reportName,
    key,
    timestamp: (t || new Date()).getTime(),
  }),
  setData: (field, level, reportName, key, data, t=null) => ({
    type: ActionTypes.reports.measurements.SET_DATA,
    field,
    level,
    reportName,
    key,
    data,
    timestamp: (t || new Date()).getTime()
  }),
  setMultipleData: (field, level, reportName, key, data, t=null) => ({
    type: ActionTypes.reports.measurements.SET_MULTIPLE_DATA,
    field,
    level,
    reportName,
    key,
    data,
    timestamp: (t || new Date()).getTime()
  }),
  setDataError: (field, level, reportName, key, errors, t=null) => ({
    type: ActionTypes.reports.measurements.SET_DATA,
    field,
    level,
    reportName,
    key,
    errors,
    timestamp: (t || new Date()).getTime()
  }),
  setMultipleDataError: (field, level, reportName, key, errors, t=null) => ({
    type: ActionTypes.reports.measurements.SET_DATA,
    field,
    level,
    reportName,
    key,
    errors,
    timestamp: (t || new Date()).getTime()
  }),
  setTimespan: (field, level, reportName, key, timespan) => ({
    type: ActionTypes.reports.measurements.SET_TIMESPAN,
    field,
    level,
    reportName,
    key,
    timespan,
  }),
  changeMultipleQueries: (multipleQueries) => ({
    type: ActionTypes.reports.measurements.CHANGE_MULTIPLE_QUERY,   
    multipleQueries: multipleQueries   
  }),  

  setSource: (field, level, reportName, key, source) => ({
    type: ActionTypes.reports.measurements.SET_SOURCE,
    field,
    level,
    reportName,
    key,
    source
  }),
  
  setQuerySource: (source) => ({
    type: ActionTypes.reports.measurements.SET_QUERY_SOURCE,
    source
  }),
  
  setPopulation: (field, level, reportName, key, population) => ({
    type: ActionTypes.reports.measurements.SET_POPULATION,
    field,
    level,
    reportName,
    key,
    population
  }),
  setOverlap: (overlap) => ({
    type: ActionTypes.reports.measurements.SET_OVERLAP,
    overlap
  }),   
  addQuery : function(multipleQueries) {
    return{
      type: ActionTypes.reports.measurements.ADD_SERIES,
      multipleQueries: multipleQueries
    };
  },  
  removeSeries : function(multipleQueries) {
    return{
      type: ActionTypes.reports.measurements.REMOVE_SERIES,
      multipleQueries: multipleQueries   
    };
  },    
  addFavourite: function(favourite) {
    return function(dispatch, getState) {
      dispatch(addFavouriteRequest());
      return favouritesAPI.addFavourite(favourite).then(function (response) {
        dispatch(addFavouriteResponse(response.success, response.errors));
      }, function (error) {
        dispatch(addFavouriteResponse(false, error));
      });
    };
  },
  updateFavourite : function(favourite, previousTitle) {
    return function(dispatch, getState) {
      dispatch(addFavouriteRequest());
      return favouritesAPI.updateFavourite(favourite).then(function (response) {
        dispatch(addFavouriteResponse(response.success, response.errors));

        if(response.success && (previousTitle !== favourite.namedQuery.title)){
        //favourite title changed. Must update dashboard layout:

          return adminAPI.getLayout().then(function(response) {
            if(response.success){

              var lays = JSON.parse(response.profile.configuration);
              lays.layout.forEach(function(component) {
                if(component.i === previousTitle){
                  component.i = favourite.namedQuery.title;
                }
              });

              var layoutRequest = {"configuration" : JSON.stringify({"layout": lays.layout})};
              return adminAPI.saveLayout(layoutRequest).then(function(response) {
                if(response.errors.length>0){
                  console.error(response.errors);          
                }
              }, function(error) {
                dispatch(_saveLayoutResponse(false, error));
              });      
            }
          }, function(error) {
            dispatch(_saveLayoutResponse(false, error));
          }); 
        }
      }, function (error) {
        dispatch(addFavouriteResponse(false, error));
      });
    };
  },
  // Complex actions: functions processed by thunk middleware

  refreshData: (field, level, reportName, key) => (dispatch, getState) => {
    var state = getState();
    
    var _state = state.reports.measurements;

    var {config} = state;
    var {metrics, levels} = config.reports.byType.measurements;

    var k = computeKey(field, level, reportName, key);
    var report = levels[level].reports[reportName];

    var {timespan: ts, source, requested, population: target} = _state[k];

    // Throttle requests
    var now = new Date();
    if (requested && (now.getTime() - requested < 1e+3)) {
      console.warn('Skipping refresh requests arriving too fast...');
      return Promise.resolve();
    }

    // Prepare population target
    if (!target) {
      // Assume target is the entire utility
      target = new population.Utility(config.utility.key, config.utility.name);
    } else if (target instanceof population.Cluster) {
      // Expand to all groups inside target cluster
      target = config.utility.clusters
        .find(c => (c.key == target.key))
          .groups.map(g => (new population.ClusterGroup(target.key, g.key)));
    } else {
      console.assert(target instanceof population.Group,
        'Expected an instance of population.Group');
    }

    // Prepare literal time range, re-order if needed
    var t0, t1, timezone = 'Etc/GMT';
    if (_.isString(ts)) {
      // Interpret this named range, as if you were at UTC+0
      [t0, t1] = TimeSpan.fromName(ts, 0).toRange();
    } else {
      // Set global timezone, move to UTC while keeping local time
      [t0, t1] = ts;
      if (t0 > t1) {
        let t = t0; t0 = t1; t1 = t;
      }
      t0 = toUtcTime(t0);
      t1 = toUtcTime(t1);
    }
    console.assert(
      moment.isMoment(t0) && t0.isUTC() && moment.isMoment(t1) && t1.isUTC(),
      'Expected 2 moment instances both flagged as UTC!');
    t1.add(1, level); // a closure time slot

    // Prepare the entire query
    var q = {
      granularity: report.granularity,
      timespan: [t0.valueOf(), t1.valueOf()],
      metrics: report.metrics,
      ranking: report.ranking,
      population: _.flatten([target]),
    };

    // Dispatch, return promise
    dispatch(actions.requestData(field, level, reportName, key, now)); 
    var pq = queryMeasurements(source, field, q, {metrics, timezone})
      .then(
        (data) => (
          dispatch(actions.setData(field, level, reportName, key, data))
        ),
        (reason) => (
          console.error(sprintf('Cannot refresh data for %s: %s', k, reason)),
          dispatch(actions.setDataError(field, level, reportName, key, [reason]))
        )
      );

    return pq;
  },
  refreshMultipleData: (field, level, reportName, key) => (dispatch, getState) => {

    var state = getState();

    var _state = state.reports.measurements;
    var {config} = state;
    var {metrics, levels} = config.reports.byType.measurements;

    var report = levels[level].reports[reportName];

    var {source, requested} = _state;

    // Throttle requests
    var now = new Date();
    if (requested && (now.getTime() - requested < 1e+3)) {
      console.warn('Skipping refresh requests arriving too fast...');
      return Promise.resolve();
    }

    dispatch(actions.requestMultipleData(field, level, reportName, key, now)); 

    var queries = _state.multipleQueries;
    if(!queries){
      return;
    }

    var promiseArray = [];
    for(var i =0; i < queries.length; i++){
    
      var tempQuery = queries[i].query;
      var target = tempQuery.population;
      var ts = tempQuery.timespan;

      // Prepare population target
      if (!target) {
        // Assume target is the entire utility
        target = new population.Utility(config.utility.key, config.utility.name);
      } else if (target instanceof population.Cluster) {
        // Expand to all groups inside target cluster
        target = config.utility.clusters
          .find(c => (c.key == target.key))
            .groups.map(g => (new population.ClusterGroup(target.key, g.key)));
      } else {
        console.assert(target instanceof population.Group,
          'Expected an instance of population.Group');
      }

      // Prepare literal time range, re-order if needed
      var t0, t1;
      if (_.isString(ts)) {
        // Interpret this named range, as if you were at UTC+0
        [t0, t1] = TimeSpan.fromName(ts, 0).toRange();
      } else {
        // Set global timezone, move to UTC while keeping local time
        [t0, t1] = ts;
        if (t0 > t1) {
          let t = t0; t0 = t1; t1 = t;
        }
        t0 = toUtcTime(t0);
        t1 = toUtcTime(t1);
      }
      console.assert(
        moment.isMoment(t0) && t0.isUTC() && moment.isMoment(t1) && t1.isUTC(),
        'Expected 2 moment instances both flagged as UTC!');
      t1.add(1, level); // a closure time slot

      var q2 = {
        granularity: report.granularity,
        timespan: [t0.valueOf(), t1.valueOf()],
        metrics: report.metrics,
        ranking: report.ranking,
        population: _.flatten([target]),
      };
      //var tim = queries[i].timezone;
      var tim = [t0.valueOf(), t1.valueOf()];

      var queryPromise = queryMeasurements(source, field, q2, {metrics, tim});
      promiseArray.push(queryPromise);
    }

    Promise.all(promiseArray).then(
      (data) => (
        dispatch(actions.setMultipleData(field, level, reportName, key, data))
      ),
      (reason) => (
        console.error(sprintf('Cannot refresh data for %s: %s', key, reason)),
        dispatch(actions.setMultipleDataError(field, level, reportName, key, [reason]))
      )
    );
    return queryPromise;
  } 
};

module.exports = actions;
