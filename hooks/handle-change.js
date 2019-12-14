import { useCallback } from 'react';

function useHandleChange(dispatch) {
  return useCallback(({ target }) => {
    dispatch({
      type: 'change',
      name: target.name,
      value: target.type === 'checkbox' ? target.checked : target.value,
    });
  }, [
    dispatch,
  ]);
}

export default useHandleChange;
