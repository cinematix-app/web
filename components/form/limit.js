import Filter from './filter';

function Limit() {
  return (
    <Filter title="5 Theaters">
      <label htmlFor="limit" className="text-nowrap">Maximum Theaters</label>
      <input
        className="form-control"
        type="number"
        id="limit"
        name="limit"
        min="0"
        value={5}
        // value={state.fields.limit}
        // onChange={handleChange}
        // disabled={locationDisabled}
      />
    </Filter>
  );
}

export default Limit;
