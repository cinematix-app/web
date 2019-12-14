import { useReducer, useMemo } from 'react';
import useHandleChange from '../../hooks/handle-change';
import Theaters from './theaters';
import Movies from './movies';
import Showtimes from './showtimes';

function reducer(state, action) {
  switch (action.type) {
    case 'change':
      return action.value === state ? null : action.value;
    default:
      throw new Error('Invalid State');
  }
}

function Filters() {
  const [state, dispatch] = useReducer(reducer, null);
  const handleChange = useHandleChange(dispatch);

  const group = useMemo(() => {
    switch (state) {
      case 'theaters':
        return (
          <Theaters />
        );
      case 'movies':
        return (
          <Movies />
        );
      case 'showtimes':
        return (
          <Showtimes />
        );
      default:
        return null;
    }
  }, [state]);

  return (
    <div className="mb-3">
      <div className="mb-3">
        <div className="input-group btn-group" role="group">
          <button className="btn btn-outline-secondary" type="button" name="filters" value="theaters" onClick={handleChange} aria-pressed={state === 'theaters'}>Theaters</button>
          <button className="btn btn-outline-secondary" type="button" name="filters" value="movies" onClick={handleChange} aria-pressed={state === 'movies'}>Movies</button>
          <button className="btn btn-outline-secondary" type="button" name="filters" value="showtimes" onClick={handleChange} aria-pressed={state === 'showtimes'}>Showtimes</button>
        </div>
      </div>
      {group}
    </div>
  );
}

export default Filters;
