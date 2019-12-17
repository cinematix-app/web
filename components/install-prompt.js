import { useEffect, useRef, useReducer } from 'react';
import storage from 'kv-storage-polyfill';
import useHandleChange from '../hooks/handle-change';

const initialState = {
  status: ''
};

function reducer(state, action) {
  switch (action.type) {
    case 'change':
      return {
        ...state,
        [action.name]: action.value,
      };
    case 'prompt':
      if (state.status === 'ready') {
        return {
          ...state,
          status: 'prompt',
        };
      }

      return state;
    default:
      throw new Error('Invalid Action');
  }
}

function InstallPrompt() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const handleChange = useHandleChange(dispatch);
  const promptRef = useRef(null);

  useEffect(() => {
    storage.get('install').then((value) => {
      dispatch({
        type: 'change',
        name: 'status',
        value: value || 'ready',
      });
    });
  }, []);

  useEffect(() => {
    if (state.status === 'ready') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        promptRef.current = e;
        dispatch({ type: 'prompt' });
      });
    }

    if (state.status === 'accept') {
      promptRef.current.prompt();
    }

    if (state.status === 'decline') {
      storage.set('install', state.status);
    }
  }, [
    state.status,
  ]);

  if (state.status !== 'prompt') {
    return null;
  }


  return (
    <div className="row mb-3 align-items-center justify-content-end">
      <div className="col-auto">
        Would you like to install Cinematix on your device?
      </div>
      <div className="col-auto">
        <button
          className="btn btn-outline-secondary"
          type="button"
          name="status"
          value="decline"
          onClick={handleChange}
        >
          Cancel
        </button>
      </div>
      <div className="col-auto">
        <button
          className="btn btn-outline-primary"
          type="button"
          name="status"
          value="accept"
          onClick={handleChange}
        >
          Install
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
