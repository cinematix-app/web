import { useContext } from 'react';
import Select from 'react-select';
import reducer from '../../context/reducer';
import useOptionsValues from '../../hooks/options-values';
import useHandleListChange from '../../hooks/handle-list-change';
import useHandleChange from '../../hooks/handle-change';

function PropSelect({ id, button }) {
  const [state, dispatch] = useContext(reducer);
  const [options, values] = useOptionsValues(state[id], state.fields[id]);
  const handleListChange = useHandleListChange(dispatch, id);
  const disabled = options.length === 0;

  const handleChange = useHandleChange(dispatch);

  return (
    <div className="row">
      <div className="input-group col-md col-12 flex-md-nowrap">
        <div className="input-group-prepend w-100 w-md-auto">
          <div className="btn-group w-100 w-md-auto" role="group">
            <button
              type="button"
              name={button}
              value="include"
              onClick={handleChange}
              aria-pressed={state.fields[button] === 'include'}
              className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields[button] === 'include' ? 'active' : ''].join(' ')}
            >
                  Include
            </button>
            <button
              type="button"
              name={button}
              value="exclude"
              onClick={handleChange}
              aria-pressed={state.fields[button] === 'exclude'}
              className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', state.fields[button] === 'exclude' ? 'active' : ''].join(' ')}
            >
                  Exclude
            </button>
          </div>
        </div>
        <Select
          inputId={id}
          name={id}
          options={options}
          className={['select-container', 'rounded-top-0', 'rounded-md-left-0', 'rounded-md-right', 'align-self-stretch'].join(' ')}
          classNamePrefix="select"
          value={values}
          onChange={handleListChange}
          isDisabled={disabled}
          isMulti
        />
      </div>
    </div>
  );
}

export default PropSelect;
