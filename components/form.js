import {
  useCallback,
  useContext,
} from 'react';
import queryReducer from '../context/query-reducer';
import Filters from './filters/filters';
import SearchSelect from './select/search';
import useHandleChange from '../hooks/handle-change';

function Form() {
  const [state, dispatch] = useContext(queryReducer);
  const handleChange = useHandleChange(dispatch);

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
            value={state.zipCode}
            onChange={handleChange}
            disabled={state.theaters.length > 0}
          />
        </div>
        <label className="col-2 col-lg-1 col-form-label text-nowrap" htmlFor="theaters">Theaters</label>
        <div className="col-md col-12">
          <SearchSelect id="theaters" property="P6644" />
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <Filters />
        </div>
      </div>
    </form>
  );
}

export default Form;
