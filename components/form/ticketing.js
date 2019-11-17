import { useMemo } from 'react';
import Filter from './filter';

const options = [
  { value: 'any', label: 'Any' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

function Ticketing({ value, onChange, disabled }) {
  const title = useMemo(() => {
    const option = options.find(o => o.value === value);

    return `${option.label} Ticketing`;
  }, [value]);

  const buttons = options.map(option => (
    <button
      type="button"
      key={option.value}
      className={['dropdown-item', value === option.value ? 'active' : ''].join(' ')}
      onClick={onChange}
      aria-pressed={value === option.value}
      value={option.value}
      name="ticketing"
    >
      {option.label}
    </button>
  ));

  return (
    <Filter title={title} disabled={disabled}>
      {buttons}
    </Filter>
  );
}

export default Ticketing;
