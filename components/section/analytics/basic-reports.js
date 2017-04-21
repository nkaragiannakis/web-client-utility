var React = require('react');
var Redux = require('react-redux');

var PropTypes = React.PropTypes;

var {Overview: BasicReports} = require('../../reports');
var {configPropType} = require('../../../prop-types');

var Page = React.createClass({
  displayName: 'Analytics.BasicReports',

  propTypes: {
    routes: PropTypes.array, // supplied by react-router
    config: configPropType,
  },

  contextTypes: {
    intl: React.PropTypes.object
  },

  render: function() {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-12">
            <BasicReports config={this.props.config} />
          </div>
        </div>
      </div>
    );
  },

});

Page.icon = 'bullseye';
Page.title = 'Section.Analytics.BasicReports';

function mapStateToProps(state, ownProps) {
  return {
    config: state.config,
  };
}

function mapDispatchToProps(dispatch, ownProps) {
  return {};
}

module.exports = Redux.connect(mapStateToProps, mapDispatchToProps)(Page);
