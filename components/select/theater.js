import { useCallback, useContext, useMemo } from 'react';
import Select from 'react-select';
import useReactor from '@cinematix/reactor';
import getOptions from '../../utils/options';
import useHandleListChange from '../../hooks/handle-list-change';
import reducer from '../../context/reducer';
import createPropertySearchReactor from '../../reactors/property-search';

function TheaterSelect({ id, disabled }) {
  const [state, dispatch] = useContext(reducer);
  const options = useMemo(
    () => getOptions(state.theaters, state.fields[id], state.search[id].result),
    [state.theaters, state.fields[id], state.search[id].result],
  );

  const values = useMemo(() => state.fields[id].map(
    tid => options.find(({ value }) => tid === value),
  ), [state.fields[id], options]);

  const handleListChange = useHandleListChange(dispatch, id);

  const searchReactor = createPropertySearchReactor(id, 'P6644');
  const search = useReactor(searchReactor, dispatch);
  const onInputChange = useCallback(value => search.next(value), []);
  const noOptions = options.length === 0;

  const noOptionsMessage = useCallback(({ inputValue }) => {
    if (noOptions && inputValue.length === 0) {
      return null;
    }

    return 'No Results';
  }, [noOptions]);

  const placeholder = useMemo(() => (options.length === 0 ? 'Search...' : undefined), [options.length]);

  return (
    <Select
      inputId={id}
      name={id}
      options={options}
      className="select-container rounded"
      classNamePrefix="select"
      value={values}
      onChange={handleListChange}
      onInputChange={onInputChange}
      isLoading={state.search[id].fetching}
      isDisabled={disabled}
      placeholder={placeholder}
      noOptionsMessage={noOptionsMessage}
      isMulti
    />
  );
}

export default TheaterSelect;
