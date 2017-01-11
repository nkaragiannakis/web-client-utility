var adminAPI = require('../api/admin');
var queryAPI = require('../api/query');
var population = require('../model/population');
var types = require('../constants/DashboardActionTypes');

var _buildTimelineQuery = function(key, name, timezone, interval) {
  return {
    'query' : {
      'timezone' : timezone,
      'time' : {
        'type' : 'ABSOLUTE',
        'start' : interval[0].toDate().getTime(),
        'end' : interval[1].toDate().getTime(),
        'granularity' : 'DAY'
      },
      'population' : [
        {
          'type' : 'UTILITY',
          'label' : name,
          'utility' : key
        }
      ],
      spatial : [
        {
          type : 'GROUP',
          group : 'd29f8cb8-7df6-4d57-8c99-0a155cc394c5'
        }
      ],
      'source' : 'METER',
      'metrics' : [
        'SUM'
      ]
    }
  };
};

var _buildChartQuery = function(key, name, timezone, interval) {
  return {
    'query' : {
      'timezone' : timezone,
      'time' : {
        'type' : 'ABSOLUTE',
        'start' : interval[0].toDate().getTime(),
        'end' : interval[1].toDate().getTime(),
        'granularity' : 'DAY'
      },
      'population' : [
        {
          'type' : 'UTILITY',
          'label' : name,
          'utility' : key
        }
      ],
      'source' : 'BOTH',
      'metrics' : [
        'SUM'
      ]
    }
  };
};

var _getTimelineInit = function(query) {
  return {
    type : types.TIMELINE_REQUEST,
    query : query
  };
};

var _getTimelineComplete = function(success, errors, data) {
  return {
    type : types.TIMELINE_RESPONSE,
    success : success,
    errors : errors,
    data : data
  };
};

var _getFeatures = function(index, timestamp, label) {
  return {
    type : types.GET_FEATURES,
    timestamp : timestamp,
    label : label,
    index: index
  };
};

var _getChartInit = function(query) {
  return {
    type : types.CHART_REQUEST,
    query : query
  };
};

var _chartRequest = function() {
  return {
    type : types.CHART_REQUEST
  };
};

var _chartResponse = function(success, errors, data, t=null) {
  return {
    type : types.CHART_RESPONSE,
    success : success,
    errors : errors,
    data : data,
    timestamp: (t || new Date()).getTime()
  };
};

var _getChartComplete = function(success, errors, data) {
  return {
    type : types.CHART_RESPONSE,
    success : success,
    errors : errors,
    data : data
  };
};

var _getCountersInit = function() {
  return {
    type : types.COUNTER_REQUEST
  };
};

var _getCountersComplete = function(success, errors, counters) {
  return {
    type : types.COUNTER_RESPONSE,
    success : success,
    errors : errors,
    counters : counters
  };
};

var _saveLayoutRequest = function() {
  return {
    type : types.SAVE_LAYOUT_REQUEST
  };
};

var _saveLayoutResponse = function(success, errors) {
  return {
    type : types.SAVE_LAYOUT_RESPONSE,
    success : success,
    errors : errors
  };
};

var DashboardActions = {
  getChart : function(key, name, timezone) {
    return function(dispatch, getState) {
      var query = _buildChartQuery(key, name, timezone, getState().dashboard.interval);

      dispatch(_getChartInit(query));

      return queryAPI.queryMeasurements(query).then(function(response) {
        var data = {
          meters : null,
          devices : null
        };

        if (response.success) {
          data.meters = response.meters;
          data.devices = response.devices;
        }
        dispatch(_getChartComplete(response.success, response.errors, data));
      }, function(error) {
        dispatch(_getChartComplete(false, error, null));
      });
    };
  },
  getDefaultChart : function(favourite) {
    return function(dispatch, getState) {
      dispatch(_chartRequest());
      return queryAPI.queryMeasurements({query: favourite.query}).then(
        res => {
          if (res.errors.length)
            throw 'The request is rejected: ' + res.errors[0].description;

          var source = favourite.query.source;

          var resultSets = (favourite.query.source == 'AMPHIRO') ? res.devices : res.meters;

          var res1 = (resultSets || []).map(rs => {
            var [g, rr] = population.fromString(rs.label);

            if (rr) {
              var points = rs.points.map(p => ({
                timestamp: p.timestamp,
                values: p.users.map(u => u[rr.field][rr.metric]).sort(rr.comparator),
              }));
              // Shape a result with ranking on users

              return _.times(rr.limit, (i) => ({
                source,
                timespan: [favourite.query.time.start,favourite.query.time.end],
                granularity: favourite.query.time.granularity,
                metric: favourite.query.metric,
                population: g,
                ranking: {...rr.toJSON(), index: i},
                data: points.map(p => ([p.timestamp, p.values[i] || null]))
              }));
            } else {
              // Shape a normal timeseries result for requested metrics
              // Todo support other metrics (as client-side "average")
              return favourite.query.metrics.map(metric => ({
                source,
                timespan: [favourite.query.time.start,favourite.query.time.end],
                granularity: favourite.query.time.granularity,
                metric,
                population: g,
                data: rs.points.map(p => ([p.timestamp, p.volume[metric]]))
              }));
            }
          });
        dispatch(_chartResponse(res.success, res.errors, _.flatten(res1)));
        return _.flatten(res1);
      });
    };
  },
  
  getTimeline : function(key, name, timezone) {
    return function(dispatch, getState) {
      var query = _buildTimelineQuery(key, name, timezone, getState().dashboard.interval);

      dispatch(_getTimelineInit(query));

      return queryAPI.queryMeasurements(query).then(function(response) {
        var data = {
          meters : null,
          devices : null,
          areas : null
        };
        if (response.success) {
          data.areas = response.areas;
          data.meters = response.meters;
          data.devices = response.devices;
        }
        dispatch(_getTimelineComplete(response.success, response.errors, data));

        dispatch(_getFeatures(0, null, null));

      }, function(error) {
        dispatch(_getTimelineComplete(false, error, null));

        dispatch(_getFeatures(0, null, null));
      });
    };
  },

  getCounters : function(key, name, timezone) {
    return function(dispatch, getState) {
      dispatch(_getCountersInit());

      return adminAPI.getCounters().then(function(response) {
        var counters = null;

        if (response.success) {
          counters = response.counters;
        }
        dispatch(_getCountersComplete(response.success, response.errors, counters));

      }, function(error) {
        dispatch(_getCountersComplete(false, error, null));
      });
    };
  },

  getFeatures : function(index, timestamp, label) {
    return _getFeatures(index, timestamp, label);
  }, 

  saveLayout : function(layout) {
    return function(dispatch, getState) {
    
      dispatch(_saveLayoutRequest());
      
      return adminAPI.saveLayout(layout).then(function(response) {
      
        dispatch(_saveLayoutResponse(response.success, response.errors));
        
      }, function(error) {
      
        dispatch(_saveLayoutResponse(false, error));
        
      });
    };
  }  
};

module.exports = DashboardActions;
