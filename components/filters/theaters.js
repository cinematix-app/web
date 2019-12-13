import { useCallback, useContext, useMemo } from 'react';
import Select from 'react-select';
import reducer from '../../context/reducer';
import useHandleChange from '../../hooks/handle-change';
import SearchSelect from '../select/search';
import PropMultiSelect from '../select/prop-multi';

const ticketingOptions = [
  { value: 'any', label: 'Any' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

function Theaters() {
  const [state, dispatch] = useContext(reducer);
  const handleChange = useHandleChange(dispatch);

  // @TODO Abstract this?
  const locationDisabled = state.fields.theaters.length > 0;

  const ticketingChange = useCallback(({ value }) => dispatch({
    type: 'change',
    name: 'ticketing',
    value,
  }), []);

  const ticketingValue = useMemo(() => (
    ticketingOptions.find(({ value }) => value === state.fields.ticketing)
  ), [state.fields.ticketing]);

  return (
    <>
      <div className="form-group">
        <label className="text-nowrap" htmlFor="limit">Maximum Theaters</label>
        <input
          className="form-control"
          type="number"
          id="limit"
          name="limit"
          min="0"
          value={state.fields.limit}
          onChange={handleChange}
          disabled={locationDisabled}
        />
      </div>
      <div className="form-group">
        <label htmlFor="ticketing">Ticketing</label>
        <Select
          inputId="ticketing"
          name="ticketing"
          options={ticketingOptions}
          className="select-container"
          classNamePrefix="select"
          value={ticketingValue}
          onChange={ticketingChange}
          isDisabled={locationDisabled}
        />
      </div>
      <div className="form-group">
        <label htmlFor="theatersx">Exclude</label>
        <SearchSelect id="theaters" exclude property="P6644" disabled={locationDisabled} />
      </div>
      <div className="form-group">
        <label>Amenities</label>
        <PropMultiSelect id="amenities" />
      </div>
    </>
  );
}

export default Theaters;
