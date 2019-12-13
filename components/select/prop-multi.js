import { useContext } from 'react';
import Select from 'react-select';
import reducer from '../../context/reducer';
import useOptionsValues from '../../hooks/options-values';
import useHandleListChange from '../../hooks/handle-list-change';

function PropMultiSelect({ id }) {
  const [state, dispatch] = useContext(reducer);

  const [options, values] = useOptionsValues(state[id], state.fields[id]);
  const handleListChange = useHandleListChange(dispatch, id);
  const disabled = options.length === 0;

  const xid = `${id}x`;
  const [optionsx, valuesx] = useOptionsValues(state[id], state.fields[xid]);
  const handleListChangex = useHandleListChange(dispatch, xid);
  const disabledx = optionsx.length === 0;

  return (
    <div className="row">
      <div className="col-md col-12 mb-2 mb-md-0 pr-md-0 input-group align-items-stretch flex-md-nowrap">
        <div className="input-group-prepend w-100 w-md-auto">
          <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left" htmlFor={id}>Include</label>
        </div>
        <Select
          inputId={id}
          name={id}
          options={options}
          className={['select-container', 'rounded-0', 'align-self-stretch'].join(' ')}
          classNamePrefix="select"
          value={values}
          onChange={handleListChange}
          isDisabled={disabled}
          isMulti
        />
      </div>
      <div className="col-md col-12 mb-2 mb-md-0 pl-md-0 input-group align-items-stretch flex-md-nowrap">
        <div className="input-group-prepend w-100 w-md-auto">
          <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left-0" htmlFor={xid}>Exclude</label>
        </div>
        <Select
          inputId={xid}
          name={xid}
          options={optionsx}
          className={['select-container', 'rounded-top-0', 'rounded-md-left-0', 'rounded-md-right', 'align-self-stretch'].join(' ')}
          classNamePrefix="select"
          value={valuesx}
          onChange={handleListChangex}
          isDisabled={disabledx}
          isMulti
        />
      </div>
    </div>
  );
}

export default PropMultiSelect;
