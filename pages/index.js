import { useReducer, useEffect } from 'react';
import Router from 'next/router';
import { Subject } from 'rxjs';
import { switchMap, flatMap, distinctUntilChanged } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';
import { DateTime } from 'luxon';
import { frame } from 'jsonld';
import Layout from '../components/layout';

const initialState = {
  fields: {
    zipCode: {
      value: '',
      valid: false,
    },
  },
  result: [],
  searchParsed: false,
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
    case 'searchParsed':
      return {
        ...state,
        searchParsed: true,
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
  flatMap(data => (
    frame(data, {
      '@context': {
        '@vocab': 'https://schema.org/',
        cinematix: 'https://cinematix.app/',
      },
      '@type': 'ScreeningEvent',
    }).then(result => result['@graph'] || [])
  )),
);

function Index() {
  const [state, dispatch] = useReducer(reducer, initialState);

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
    if (!state.searchParsed) {
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
    const url = new URL(window.location.href);
    url.searchParams.forEach((value, name) => {
      dispatch({
        type: 'change',
        name,
        value,
        valid: null,
      });
    });

    dispatch({ type: 'searchParsed' });
  }, []);

  const showtimes = [...(state.result || [])].filter(({ offers }) => (
    offers.availability !== 'https://schema.org/Discontinued'
  )).sort((a, b) => (
    // @TODO make the sort configurable.
    DateTime.fromISO(a.startDate) - DateTime.fromISO(b.startDate)
  )).map((showtime) => {
    let movieDisplay;
    if (showtime.workPresented) {
      movieDisplay = (
        <a href={showtime.workPresented.url}>
          {showtime.workPresented.name}
        </a>
      );
    }
    
    let theaterDisplay;
    if (showtime.location) {
      theaterDisplay = (
        <a href={showtime.location.url}>
          {showtime.location.name}
        </a>
      );
    }

    let className = [
      'btn',
      'btn-block',
    ];
    if (showtime.offers.availability === 'https://schema.org/InStock') {
      className = [
        ...className,
        'btn-outline-primary',
      ];
    } else {
      className = [
        ...className,
        'btn-outline-secondary',
        'disabled',
      ];
    }

    return (
      <div key={showtime['@id']} className="row mb-2">
        <div className="col-md-4">
          {movieDisplay}
        </div>
        <div className="col-md-4">
          {theaterDisplay}
        </div>
        <div className="col-md-4">
          <a className={className.join(' ')} href={showtime.offers.url}>
            {DateTime.fromISO(showtime.startDate).toLocaleString(DateTime.TIME_SIMPLE)}
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
