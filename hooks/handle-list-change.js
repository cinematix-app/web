import { useCallback } from 'react';

function useHandleListChange(dispatch, list) {
  return useCallback(data => (
    dispatch({
      type: 'change',
      name: list,
      value: data ? data.map(({ value }) => value) : [],
    })
  ), [
    dispatch,
    list,
  ]);
}

export default useHandleListChange;
