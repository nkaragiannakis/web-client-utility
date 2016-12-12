var React = require('react');
var bs = require('react-bootstrap');
var Select = require('react-select');
var { FormattedMessage } = require('react-intl');

var createWizard = require('react-wiz');
var util = require('../../helpers/wizard');
var DisplayParams = require('../DisplayParams');

function WizardItem (props) {
  const { id, title, description, children, hasPrevious, hasNext, isLast, onNextClicked, onPreviousClicked, reset, errors, completed, value, values, step, onComplete, next, intl } = props;
  const params = util.getFriendlyParams(values, intl);
  return (
    <div className='wizard-item' style={{ margin: '0 25px' }}>
      <bs.Row>
        <h2 style={{marginTop: 0}}><FormattedMessage id={`Wizard.items.${id}.title`} /></h2>
          <h4><i><FormattedMessage id={`Wizard.items.${id}.description`} /></i></h4>

          <br />
      </bs.Row>
      <div className='wizard-item-select'>
        {
          children  
        }
      </div>
      
    <bs.Row >
      <div className='wizard-controls'>
        <bs.ButtonGroup style={{width: '100%', marginTop: 30 }}>
          {
            <bs.Button 
              style={{float: 'left'}}
              disabled={!hasPrevious} 
              onClick={onPreviousClicked}
            >
              Previous
            </bs.Button>
          }
          <bs.Button 
           bsStyle='warning'
           style={{float: 'left', marginLeft: 10}}
           onClick={reset}
         >
           <i className='fa fa-undo'></i>  Reset
         </bs.Button>
         {
           
           hasNext ? 
             <bs.Button 
               style={{float: 'right'}}
               onClick={onNextClicked} 
               >
                 Next
                </bs.Button>
              :
               <bs.Button 
                  bsStyle='primary' 
                  style={{float: 'right'}}
                  onClick={onComplete}
                >
                <i className='fa fa-calculator'></i> Calculate
              </bs.Button>
         }
       </bs.ButtonGroup>
     </div>
   </bs.Row>
   <hr />
   <bs.Row style={{ margin: '20px 0', fontSize: '1.2em' }}>
       {
         errors ? 
           <span style={{ fontSize: '1.3em', color: '#CD4D3E' }} >
             <i className='fa fa-warning' style={{ marginRight: 5 }}/>
             <FormattedMessage id={`Wizard.validation.${errors}`} />
           </span> 
             : 
               <DisplayParams 
                params={params}
                limit={4}
              />
       }
    </bs.Row>
    
  </div>
  );
}


module.exports = createWizard(WizardItem);
