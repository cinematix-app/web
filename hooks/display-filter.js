import { useCallback } from 'react';
import displayFilter from '../utils/display-filter';

function useDisplayFilter(include, exclude) {
  return useCallback(data => displayFilter(
    include,
    exclude,
    data,
  ), [
    include,
    exclude,
  ]);
}

export default useDisplayFilter;
