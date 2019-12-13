import { useMemo } from 'react';

function useValues(field, options) {
  return useMemo(() => field.map(
    sid => options.find(({ value }) => sid === value),
  ), [field, options]);
}

export default useValues;
