import Select from 'react-select';
import Filter from './filter';

function Ticketing({ options }) {
  return (
    <Filter title="Offline Ticketing">
      <label className="col-auto col-form-label text-nowrap" htmlFor="ticketing">Ticketing</label>
      <Select
        inputId="ticketing"
        name="ticketing"
        options={options}
        className="select-container"
        classNamePrefix="select"
        value="offline"
        // value={ticketingValue}
        // onChange={ticketingChange}
        // isDisabled={locationDisabled}
      />
    </Filter>
  );
}

export default Ticketing;
