import { useMemo } from 'react';
import getOptions from '../utils/options';

function useOptions(list, field, searchResults = []) {
  return useMemo(
    () => getOptions(list, field, searchResults),
    [list, field, searchResults],
  );
}

export default useOptions;
