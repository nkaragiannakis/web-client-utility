var React = require('react');
var bs = require('react-bootstrap');
var moment = require('moment');
var DatetimeInput = require('react-datetime');
var { FormattedDate } = require('react-intl');


var WhenItem = React.createClass({
  getInitialState: function() {
    return {       
      showModal: false,
      timespan: this.props.initialValue.timespan ? this.props.initialValue.timespan : this.getLastYear(),
    };
  },
  getLastYear: function() {
    return [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')];
  },
  getValue: function(selected, timespan, label) {
    if (!Array.isArray(timespan) || timespan.length < 2 || timespan.length > 3) {
      throw 'timespan must be array of two timestamps';
    }
    return { selected, type: 'ABSOLUTE', start: timespan[0].valueOf(), end: timespan[1].valueOf(), label };
  },
  render: function() {
    const { value, setValue, intl } = this.props;

    const { timespan } = this.state;

    const _t = x => intl.formatMessage({ id: x });

    const lastLabel = _t('Wizard.items.time.options.last.value');
    const chooseLabel = _t('Wizard.common.choose');

    return (
      <div>
        <bs.Col md={4}>
          <bs.ButtonGroup vertical block>
              <bs.Button bsSize='large' bsStyle={value.selected === 'lastYear' ? 'primary' : 'default'} style={{marginBottom: 10}} onClick={() => setValue( this.getValue('lastYear', this.getLastYear(), lastLabel) )}>{lastLabel}</bs.Button>
            <bs.Button bsSize='large' bsStyle={value.selected === 'custom' ? 'primary' : 'default'} style={{marginBottom: 10}} onClick={() => this.setState({showModal: true})}>{chooseLabel}</bs.Button>
          </bs.ButtonGroup>
        </bs.Col>
        
        <bs.Col md={7} style={{ textAlign: 'left' }}>
          {
            value.selected === 'custom' ?
              <div>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#666' }}>{_t('Wizard.items.time.modal')}: </span>
              <b>
                <FormattedDate value={timespan[0]} month="numeric" year="numeric" /> <span>&nbsp;-&nbsp;</span> <FormattedDate value={timespan[1]} month="numeric" year="numeric" />
              </b>
            </div>
              :
                <span />
          }
        </bs.Col>


        <bs.Modal
          show={this.state.showModal}
          animation={false}
          className='confirmation-modal'
          backdrop='static'
          onHide={() => this.setState({showModal: false})}
          > 
          <bs.Modal.Header closeButton>
            <h4>{_t('Wizard.items.time.modal')}</h4>
          </bs.Modal.Header>
          <bs.Modal.Body>          
            {
              (() => {
                var { timespan } = this.state;
                const [t0, t1] = timespan;

                return (
                  <div className="form-group">
                    <div>
                      <label style={{ width: '100%' }}><span>{_t('Wizard.items.time.from')}:</span>
                        <DatetimeInput  
                          value={t0} 
                          className='date-input'
                          dateFormat="MM/YYYY"
                          closeOnSelect
                          isValidDate={curr => curr.valueOf() <= t1}
                          onChange={(val) => (this.setState({ timespan: [val, t1] }))} 
                        />
                      </label>
                      <br />
                      <label style={{ width: '100%' }}><span style={{ marginRight: 20 }}>{_t('Wizard.items.time.to')}:</span>
                      <DatetimeInput 
                        value={t1}
                        className='date-input'
                        dateFormat="MM/YYYY"
                        closeOnSelect
                        isValidDate={curr => curr.valueOf() >= t0 && curr.valueOf() < moment().subtract(1, 'month').valueOf()}
                        onChange={(val) => (this.setState({ timespan: [t0, val] }))} 
                        />
                      </label>
                      <p className="help text-muted">{_t('Wizard.items.time.help')}</p>
                    </div>
                  </div>
                  );
              })()
            }
          </bs.Modal.Body>
          <bs.Modal.Footer>
            <bs.Button onClick={() => { 
              setValue(this.getValue('custom', 
                                    [
                                      moment(this.state.timespan[0]).startOf('month').valueOf(), 
                                      moment(this.state.timespan[1]).endOf('month').valueOf()
                                    ],
                                    `${moment(this.state.timespan[0]).format('MM/YYYY')}` + 
                                    '-' +
                                      `${moment(this.state.timespan[1]).format('MM/YYYY')}`
                                    ));   
             this.setState({showModal: false})} }
           >
            OK
          </bs.Button>
            <bs.Button onClick={() => this.setState({showModal: false})}>{_t('Buttons.Cancel')}</bs.Button>
          </bs.Modal.Footer>
        </bs.Modal> 
      </div>
    );
  }
});

module.exports = WhenItem; 
