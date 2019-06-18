import { useReducer, useEffect, useRef } from 'react';
import Router from 'next/router';
import { Subject } from 'rxjs';
import { switchMap, distinctUntilChanged } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';
import { DateTime } from 'luxon';
import Layout from '../components/layout';

const dateTimeFormat = 'yyyy-mm-dd+HH:mm';

const initialState = {
  fields: {
    zipCode: {
      value: '',
      valid: false,
    },
  },
  result: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'change':
      return {
        ...state,
        fields: {
          ...state.fields,
          [action.name]: {
            value: action.value,
            valid: action.valid,
          },
        },
      };
    case 'result':

      return {
        ...state,
        result: action.result,
      };
    default:
      throw new Error();
  }
}

const query = (new Subject()).pipe(
  distinctUntilChanged((z, y) => z.zipCode === y.zipCode),
  switchMap((q) => {
    const zipCode = q.zipCode.padStart(5, '0'); 
    const date = DateTime.local();

    const url = new URL('https://cinematix.app/api/showtimes');
    url.searchParams.set('zipCode', zipCode);

    // @TODO Allow the user to specify the date.
    url.searchParams.set('date', date.toISODate());

    // @TODO handle an error!
    return ajax.getJSON(url.toString());
  }),
);

function Index() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const searchParsed = useRef(false);

  const handleChange = ({ target }) => dispatch({
    type: 'change',
    name: target.name,
    value: target.value,
    valid: target.checkValidity(),
  });

  // Subscribe the query changes and dispatch the results.
  useEffect(() => {
    query.subscribe((result) => {
      dispatch({
        type: 'result',
        result,
      });
    });
  }, []);

  // Update the query.
  useEffect(() => {
    // Wait for a valid Zip Code before doing anything.
    if (state.fields.zipCode.valid === false) {
      return;
    }

    query.next({
      zipCode: state.fields.zipCode.value,
    });
  }, [
    state.fields.zipCode.value,
    state.fields.zipCode.valid,
  ]);

  // Update the route.
  useEffect(() => {
    // Wait for the search to be parsed.
    if (!searchParsed.current) {
      return;
    }

    const searchParams = new URLSearchParams();
    Object.keys(state.fields).forEach((name) => {
      if (state.fields[name].value) {
        searchParams.set(name, state.fields[name].value);
      } else {
        searchParams.delete(name);
      }
    });

    const search = searchParams.toString();
    Router.replace(search ? `/?${search}` : '/');
  }, [
    state.fields.zipCode.value,
  ]);

  // Update the query
  useEffect(() => {
    const search = Router.query;
    Object.keys(search).forEach((name) => {
      dispatch({
        type: 'change',
        name,
        value: search[name] || '',
        valid: null,
      });
    });

    searchParsed.current = true;
  }, []);

  const showtimes = [...(state.result.showtimes || [])].filter(({ expired }) => {
    return !expired;
  }).sort((a, b) => (
    // @TODO make the sort configurable.
    DateTime.fromFormat(a.datetime, dateTimeFormat) > DateTime.fromFormat(b.datetime, dateTimeFormat)
  )).map((showtime) => {
    const movie = (state.result.movies || []).find(m => showtime.movie === m.id);
    const theater = (state.result.theaters || []).find(t => showtime.theater === t.id);

    let movieDisplay;
    if (movie) {
      movieDisplay = (
        <a href={movie.url}>
          {movie.title}
        </a>
      );
    }
    
    let theaterDisplay;
    if (theater) {
      theaterDisplay = (
        <a href={theater.url}>
          {theater.name}
        </a>
      );
    }

    return (
      <div key={showtime.id} className="row mb-2">
        <div className="col-md-4">
          {movieDisplay}
        </div>
        <div className="col-md-4">
          {theaterDisplay}
        </div>
        <div className="col-md-4">
          <a className="btn btn-outline-primary btn-block" href={showtime.url}>
            {DateTime.fromFormat(showtime.datetime, dateTimeFormat).toLocaleString(DateTime.TIME_SIMPLE)}
          </a>
        </div>
      </div>
    );
  });

  return (
    <Layout>
      <form>
        <div className="row form-group">
          <label className="col-auto col-form-label" htmlFor="zipCode">Zip Code</label>
          <div className="col">
            <input
              className="form-control form-control-sm"
              type="number"
              id="zipCode"
              name="zipCode"
              min="0"
              max="99999"
              required
              value={state.fields.zipCode.value}
              onChange={handleChange}
            />
          </div>
        </div>
      </form>
      {showtimes}
    </Layout>
  );
}

export default Index;
