import Filter from './filter';

function Limit({ value, onChange, disabled }) {
  const number = parseInt(value, 10) || 0;
  return (
    <Filter title={`${number.toLocaleString()} Theaters`} className="p-3">
      <label htmlFor="limit" className="text-nowrap">Maximum Theaters</label>
      <input
        className="form-control"
        type="number"
        id="limit"
        name="limit"
        min="0"
        max="20"
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </Filter>
  );
}

export default Limit;
