import { useCallback, useContext, useMemo, useReducer } from 'react';
import Select from 'react-select';
import useReactor from '@cinematix/reactor';
import getOptions from '../../utils/options';
import useHandleListChange from '../../hooks/handle-list-change';
import reducer from '../../context/reducer';
import createPropertySearchReactor from '../../reactors/property-search';

const initialState = {
  result: [],
  fetching: false,
};

function searchReducer(state, action) {
  switch (action.type) {
    case 'fetch':
      return {
        ...state,
        fetching: true,
      };
    case 'result':
      return {
        ...state,
        result: action.result || [],
        fetching: false,
      };
    default:
      throw new Error('Invalid Action');
  }
}

function SearchSelect({ id, list, property, disabled }) {
  const [state, dispatch] = useContext(reducer);
  const [searchState, searchDispatch] = useReducer(searchReducer, initialState);

  const listId = list || id;
  const options = useMemo(
    () => getOptions(state[listId], state.fields[id], searchState.result),
    [state[listId], state.fields[id], searchState.result],
  );

  const values = useMemo(() => state.fields[id].map(
    sid => options.find(({ value }) => sid === value),
  ), [state.fields[id], options]);

  const handleListChange = useHandleListChange(dispatch, id);

  const searchReactor = createPropertySearchReactor(property);
  const search = useReactor(searchReactor, searchDispatch);
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
      isLoading={searchState.fetching}
      placeholder={placeholder}
      isDisabled={disabled}
      noOptionsMessage={noOptionsMessage}
      isMulti
    />
  );
}

export default SearchSelect;
