import useOptions from './options';
import useValues from './values';

function useOptionsValues(list, field, searchResults = []) {
  const options = useOptions(list, field, searchResults);
  const values = useValues(field, options);
  return [options, values];
}

export default useOptionsValues;
