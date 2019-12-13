import {
  useCallback,
  useContext,
  useReducer,
} from 'react';
import Select from 'react-select';
import useReactor from '@cinematix/reactor';
import useHandleListChange from '../../hooks/handle-list-change';
import reducer from '../../context/reducer';
import createPropertySearchReactor from '../../reactors/property-search';
import useOptionsValues from '../../hooks/options-values';

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

function SearchSelect({
  id,
  property,
  exclude,
  disabled,
  className,
}) {
  const [state, dispatch] = useContext(reducer);
  const [searchState, searchDispatch] = useReducer(searchReducer, initialState);

  const fieldId = exclude ? `${id}x` : id;

  const [options, values] = useOptionsValues(
    state[id],
    state.fields[fieldId],
    searchState.result,
  );

  const handleListChange = useHandleListChange(dispatch, fieldId);

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

  const placeholder = options.length === 0 ? 'Search...' : undefined;

  return (
    <Select
      inputId={id}
      name={id}
      options={options}
      className={className || 'select-container rounded'}
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
