import { useEffect, useRef, useReducer } from 'react';
import storage from 'kv-storage-polyfill';
import useHandleChange from '../hooks/handle-change';

const initialState = {
  status: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'storage':
      if (action.payload === 'declined') {
        return {
          ...state,
          status: action.payload,
        };
      }

      return {
        ...state,
        status: state.status === 'promptReady' ? 'prompt' : 'ready',
      };
    case 'change':
      return {
        ...state,
        [action.name]: action.value,
      };
    case 'promptReady':
      return {
        ...state,
        status: state.status === 'ready' ? 'prompt' : 'promptReady',
      };
    default:
      throw new Error('Invalid Action');
  }
}

function InstallPrompt() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const handleChange = useHandleChange(dispatch);
  const promptRef = useRef(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      promptRef.current = e;
      dispatch({ type: 'promptReady' });
    });

    storage.get('install').then((value) => {
      dispatch({
        type: 'storage',
        payload: value,
      });
    });
  }, []);

  useEffect(() => {
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
