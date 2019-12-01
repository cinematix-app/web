import {
  useCallback,
  useContext,
  useMemo,
} from 'react';
import Select from 'react-select';
import reducer from '../context/reducer';
import getPropValue from '../utils/prop-value';
import getPropOptions from '../utils/prop-options';
import Filters from './filters/filters';
import TheaterSelect from './select/theater';

function Form() {
  const [state, dispatch] = useContext(reducer);

  const handleChange = useCallback(({ target }) => {
    dispatch({
      type: 'change',
      name: target.name,
      value: target.type === 'checkbox' ? target.checked : target.value,
    });
  }, []);

  const handleListChange = list => data => dispatch({
    type: 'change',
    name: list,
    value: data ? data.map(({ value }) => value) : [],
  });

  const {
    options: propsxOptions,
    value: propsxValue,
  } = useMemo(() => {
    const options = getPropOptions(state.props, state.fields.propsx);

    return {
      options,
      value: getPropValue(options, state.fields.propsx),
    };
  }, [state.props, state.fields.propsx]);

  const {
    options: propsOptions,
    value: propsValue,
  } = useMemo(() => {
    const options = getPropOptions(state.props, state.fields.props);

    return {
      options,
      value: getPropValue(options, state.fields.props),
    };
  }, [state.props, state.fields.props]);

  const submitCallback = useCallback(e => e.preventDefault(), []);

  return (
    <form onSubmit={submitCallback}>
      <div className="row form-group">
        <label className="col-2 col-lg-1 col-form-label text-nowrap" htmlFor="zipCode">Zip Code</label>
        <div className="col-md-2 col-12">
          <input
            className="form-control"
            type="text"
            id="zipCode"
            name="zipCode"
            pattern="[0-9]{5}"
            value={state.fields.zipCode}
            onChange={handleChange}
            disabled={state.fields.theaters.length > 0}
          />
        </div>
        <label className="col-2 col-lg-1 col-form-label text-nowrap" htmlFor="theaters">Theaters</label>
        <div className="col-md col-12">
          <TheaterSelect id="theaters" />
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <Filters />
        </div>
      </div>
      <div className="row form-group">
        <span className="col-2 col-lg-1 col-form-label">Properties</span>
        <div className="col-md col-12 mb-2 mb-md-0 pr-md-0 input-group align-items-stretch flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left" htmlFor="props">Include</label>
          </div>
          <Select
            inputId="props"
            name="props"
            options={propsOptions}
            className={['select-container', 'rounded-0', 'align-self-stretch'].join(' ')}
            classNamePrefix="select"
            value={propsValue}
            onChange={handleListChange('props')}
            isMulti
          />
        </div>
        <div className="col-md col-12 mb-2 mb-md-0 pl-md-0 input-group align-items-stretch flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left-0" htmlFor="propsx">Exclude</label>
          </div>
          <Select
            inputId="propsx"
            name="propsx"
            options={propsxOptions}
            className={['select-container', 'rounded-top-0', 'rounded-md-left-0', 'rounded-md-right', 'align-self-stretch'].join(' ')}
            classNamePrefix="select"
            value={propsxValue}
            onChange={handleListChange('propsx')}
            isMulti
          />
        </div>
      </div>
    </form>
  );
}

export default Form;
