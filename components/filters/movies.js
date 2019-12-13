import { useContext } from 'react';
import reducer from '../../context/reducer';
import useHandleChange from '../../hooks/handle-change';
import SearchSelect from '../select/search';
import PropSelect from '../select/prop';
import PropMultiSelect from '../select/prop-multi';

function Movies() {
  const [state, dispatch] = useContext(reducer);
  const handleChange = useHandleChange(dispatch);

  return (
    <>
      <div className="form-group">
        <label htmlFor="movies">Movies</label>
        <div className="row">
          <div className="input-group col-md col-12 flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <div className="btn-group w-100 w-md-auto" role="group">
                <button
                  type="button"
                  name="movie"
                  value="include"
                  onClick={handleChange}
                  aria-pressed={state.fields.movie === 'include'}
                  className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.movie === 'include' ? 'active' : ''].join(' ')}
                >
                  Include
                </button>
                <button
                  type="button"
                  name="movie"
                  value="exclude"
                  onClick={handleChange}
                  aria-pressed={state.fields.movie === 'exclude'}
                  className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', state.fields.movie === 'exclude' ? 'active' : ''].join(' ')}
                >
                  Exclude
                </button>
              </div>
            </div>
            <SearchSelect
              id="movies"
              property="P5693"
              className={['select-container', 'rounded-top-0', 'rounded-md-left-0', 'rounded-md-right', 'align-self-stretch'].join(' ')}
            />
          </div>
        </div>
      </div>
      <div className="form-group">
        <label>MPAA Ratings</label>
        <PropSelect id="ratings" button="rating" />
      </div>
      <div className="form-group">
        <label>Genres</label>
        <PropMultiSelect id="genres" />
      </div>
    </>
  );
}

export default Movies;
