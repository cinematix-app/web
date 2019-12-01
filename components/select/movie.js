import { useCallback, useContext, useMemo } from 'react';
import Select from 'react-select';
import useReactor from '@cinematix/reactor';
import getOptions from '../../utils/options';
import useHandleListChange from '../../hooks/handle-list-change';
import reducer from '../../context/reducer';
import createPropertySearchReactor from '../../reactors/property-search';


function MovieSelect() {
  const [state, dispatch] = useContext(reducer);
  const options = useMemo(
    () => getOptions(state.movies, state.fields.movies, state.search.movies.result),
    [state.movies, state.fields.movies, state.search.movies.result],
  );

  const values = useMemo(() => state.fields.movies.map(
    mid => options.find(({ value }) => mid === value),
  ), [state.fields.movies, options]);

  const handleListChange = useHandleListChange(dispatch, 'movies');

  const searchReactor = createPropertySearchReactor('movies', 'P5693');
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
      inputId="movies"
      name="movies"
      options={options}
      className="select-container rounded"
      classNamePrefix="select"
      value={values}
      onChange={handleListChange}
      onInputChange={onInputChange}
      isLoading={state.search.movies.fetching}
      placeholder={placeholder}
      noOptionsMessage={noOptionsMessage}
      isMulti
    />
  );
}

export default MovieSelect;
