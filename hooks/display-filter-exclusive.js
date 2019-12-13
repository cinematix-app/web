import { useCallback } from 'react';
import displayFilterExclusive from '../utils/display-filter-exclusive';

function useDisplayFilterExclusive(values, options) {
  return useCallback(data => displayFilterExclusive(
    values,
    options,
    data,
  ), [
    values,
    options,
  ]);
}

export default useDisplayFilterExclusive;
