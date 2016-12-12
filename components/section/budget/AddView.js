var React = require('react');
var { connect } = require('react-redux');
var bs = require('react-bootstrap');
var Modal = require('../../Modal');
//var Wizard = require('../../common/Wizard');
var Wizard = require('../../common/Wizard');
var { FormattedMessage } = require('react-intl');
var { SetNameItem, WhoItem, WhereItem, WhenItem, SelectBudgetType, SelectSavingsScenario, SetSavingsPercentageItem, SetGoalItem, DistributionItem  } = require('../../common/WizardReusableItems');
var { nameToId } = require('../../../helpers/common');

const validateBudgetType = ({value}) => {
  if (!value) {
    throw 'noBudget';
  }
}

const validateWho = (value) => {
  if ((!Array.isArray(value) && value.value !== 'all') || 
     (Array.isArray(value) && value.length == 0)) {
    throw 'noWho';
  }
};

const validateWhere = (value) => {
  if ((!Array.isArray(value) && value.value !== 'all') ||
     (Array.isArray(value) && value.length == 0)) {
       throw 'noWhere';
  }
};
const validateSavingsPercentage = ({value}) => {
  if (isNaN(value)) {
    throw 'notANumber';
  }
  else if (value <= 0 || value > 100) {
    throw 'notPercentage';
  }
};

const validateDistribution = ({value}) => {
  if (!value) {
    throw 'noDistribution';
  }
};
const validateGoal = ({value}) => {
  if (isNaN(value)) {
    throw 'notANumber';
  }
  else if (value <= 0 || value > 100) {
    throw 'notPercentage';
  }
};
const validateSavingsPotentialSelect = ({value}) => {
  if (!value) {
      throw 'noSavingsScenario';
  }
};

const validateName = function ({value}) { 
  const existing = this.props.budgets.map(budget => nameToId(budget.name));

  if (!value) {
    throw 'noName';
  }
  else if (existing.includes(nameToId(value))) {
    throw 'nameExists';
  }
};

var BudgetsAdd = React.createClass ({
  componentWillMount: function() {

    //TODO: temp way to load areas in state
    const utility = this.props.profile.utility;
    if(!this.props.areas) {
      const population = {
          utility: utility.key,
          label: utility.name,
          type: 'UTILITY'
      };
      this.props.actions.getTimeline(population);
    }
  },
//TODO: have to create geojson from areas object since API not ready yet
  getGeoJSON: function(areasObj) {
    if (!areasObj) return {};
    const areas = Object.keys(areasObj).map(key => areasObj[key]);
    return {
      type : 'FeatureCollection',
      features : areas.map(area => ({
        'type' : 'Feature',
        'geometry' : area.geometry,
        'properties' : {
          'label' : area.label,
          'cluster': 'area'
        }
      })),
      crs : {
        type : 'name',
        properties : {
          name : 'urn:ogc:def:crs:OGC:1.3:CRS84'
        }
      }
    };
  },

  render: function() {
    const { groups, clusters, segments, areas, actions, wizardType, validationError, savings, intl } = this.props;
    const _t = intl.formatMessage;
    const { setValidationError, setAddBudgetWizardType, goToListView, addBudgetScenario } = actions;
    const geojson = this.getGeoJSON(areas);
    return (
      <bs.Panel header='Add new budget'>
        <bs.Row>
          <bs.Col md={6}>
          </bs.Col>
          <bs.Col md={6} style={{textAlign: 'right'}}>
            <bs.Button bsStyle='success' onClick={() => { goToListView(); }}><i className='fa fa-chevron-left'></i> Back to all</bs.Button>
          </bs.Col>
        </bs.Row>
        <hr/>
              <Wizard
                onComplete={(values) => { addBudgetScenario({...values}); goToListView();  }}
                validateLive
                childrenProps={{ intl }}
              >
                <SelectBudgetType
                  id='budgetType'
                  initialValue={{}}
                  next={value => value.value === 'estimate' ? 'goal' : 'scenario'} 
                  validate={validateBudgetType}
                />
                <SelectSavingsScenario
                  id='scenario'
                  items={savings}
                  initialValue={{}}
                  validate={validateSavingsPotentialSelect}
                />
                <SetSavingsPercentageItem
                  id='savings'
                  initialValue={{value: 0, label: 0}}
                  validate={validateSavingsPercentage}
                  next={value => 'name'} 
                />
                <SetGoalItem
                  id='goal'
                  initialValue={{value: 0, label: 0}}
                  validate={validateGoal}
                />
                <DistributionItem
                  id='distribution'
                  initialValue={{}}
                  validate={validateDistribution}
                />
                <WhoItem
                  id='who'
                  groups={groups}
                  clusters={clusters}
                  initialValue={{}}
                  validate={validateWho}
                />
                <WhereItem
                 id='where'
                 clusters={segments.map(segment => ({ 
                   ...segment, 
                   groups: geojson.features ? geojson.features.map(f => ({ 
                      feature: f,
                      clusterKey: f.properties.cluster, 
                      name: f.properties.label, 
                      key: f.properties.label 
                    })) : [] 
                  }))}
                 initialValue={{}}
                 validate={validateWhere}
                />
                <WhoItem
                  id='excludeWho'
                  initialValue={{}}
                  groups={groups}
                  clusters={clusters}
                  noAll
                />
                <WhereItem
                  id='excludeWhere'
                  clusters={segments.map(segment => ({ 
                   ...segment, 
                   groups: geojson.features ? geojson.features.map(f => ({ 
                      feature: f,
                      clusterKey: f.properties.cluster, 
                      name: f.properties.label, 
                      key: f.properties.label 
                    })) : [] 
                  }))}
                  initialValue={{}}
                  noAll
                />
                <SetNameItem
                  id='name'
                  initialValue=''
                  validate={validateName.bind(this)}
                />
                <div
                  id='confirmation'
                  initialValue={{}}
                />
               </Wizard>

    </bs.Panel>
    );
  }
});

function mapStateToProps(state) {
  return {
    savings: state.savings.scenarios,
    areas: state.map.map.areas,
    profile: state.session.profile,
  };
}

module.exports = connect(mapStateToProps)(BudgetsAdd);
