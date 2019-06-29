import { useReducer, useEffect, useRef, useMemo } from 'react';
import Router from 'next/router';
import { Subject } from 'rxjs';
import { switchMap, flatMap, distinctUntilChanged } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';
import { DateTime } from 'luxon';
import { frame } from 'jsonld';
import Select from 'react-select';
import Layout from '../components/layout';

const initialState = {
  fields: {
    zipCode: '',
    limit: '10',
    ticketing: 'both',
    startDate: 'today',
  },
  valid: false,
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
          [action.name]: action.value,
        },
        valid: action.valid,
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
  distinctUntilChanged((z, y) => (
    z.zipCode === y.zipCode
    && z.limit === y.limit
    && z.ticketing === y.ticketing
    && z.startDate === y.startDate
  )),
  switchMap((q) => {
    const zipCode = q.zipCode.padStart(5, '0');
    const url = new URL('https://cinematix.app/api/showtimes');
    url.searchParams.set('zipCode', zipCode);

    ['limit', 'ticketing'].forEach((field) => {
      if (q[field] !== initialState.fields[field]) {
        url.searchParams.set(field, q[field]);
      }
    });

    // Always set the start date to ensure the correct results are returned.
    // They might not be correct because of timezones. :(
    switch (q.startDate) {
      case 'today':
        url.searchParams.set('startDate', DateTime.local().toFormat('yyyy-MM-dd'));
        break;
      case 'tomorrow':
        url.searchParams.set('startDate', DateTime.local().plus({ days: 1 }).toFormat('yyyy-MM-dd'));
        break;
      default:
        url.searchParams.set('startDate', q.startDate);
        break;
    }

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

const ticketingOptions = [
  { value: 'both', label: 'Both' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

function Index() {
  const formRef = useRef(null);
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleChange = ({ target }) => {
    dispatch({
      type: 'change',
      name: target.name,
      value: target.type === 'checkbox' ? target.checked : target.value,
      valid: formRef.current ? formRef.current.checkValidity() : null,
    });
  };

  // Update the query
  // @TODO Pass this in with server rendering!
  useEffect(() => {
    if (!state.searchParsed && typeof window !== 'undefined') {
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
    }
  }, []);

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
    if (state.valid === false) {
      return;
    }

    const {
      zipCode,
      limit,
      ticketing,
      startDate,
    } = state.fields;

    query.next({
      zipCode,
      limit,
      ticketing,
      startDate,
    });
  }, [
    state.valid,
    state.fields.zipCode,
    state.fields.limit,
    state.fields.ticketing,
    state.fields.startDate,
  ]);

  // Update the route.
  useEffect(() => {
    // Wait for the search to be parsed.
    if (!state.searchParsed) {
      return;
    }

    const searchParams = new URLSearchParams();
    Object.keys(state.fields).forEach((name) => {
      if (state.fields[name] !== initialState.fields[name] && state.fields[name] !== '') {
        searchParams.set(name, state.fields[name]);
      } else {
        searchParams.delete(name);
      }
    });

    const search = searchParams.toString();
    Router.replace(search ? `/?${search}` : '/');
  }, [
    state.fields.zipCode,
    state.fields.limit,
    state.fields.ticketing,
    state.fields.startDate,
  ]);

  const now = DateTime.local();
  const today = now.toFormat('yyyy-MM-dd');

  const showtimes = useMemo(() => [...(state.result || [])].filter(({ offers }) => (
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

    const startDate = DateTime.fromISO(showtime.startDate);
    const longFormat = {
      month: 'long',
      weekday: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    };
    const timeFormat = startDate > now.endOf('day') ? longFormat : DateTime.TIME_SIMPLE;

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
            <time dateTime={startDate.toISO()}>
              {startDate.toLocaleString(timeFormat)}
            </time>
          </a>
        </div>
      </div>
    );
  }), [
    state.result,
  ]);

  const customStartDate = !['today', 'tomorrow'].includes(state.fields.startDate);

  const dayAfterTomorrow = now.plus({ days: 2 }).toFormat('yyyy-MM-dd');

  return (
    <Layout>
      <form ref={formRef} onSubmit={e => e.preventDefault()}>
        <div className="row form-group">
          <label className="col-auto col-form-label" htmlFor="zipCode">Zip Code</label>
          <div className="col-md col-12">
            <input
              className="form-control"
              type="number"
              id="zipCode"
              name="zipCode"
              min="501"
              max="99999"
              required
              value={state.fields.zipCode}
              onChange={handleChange}
            />
          </div>
          <label className="col-auto col-form-label" htmlFor="limit">Max. Theaters</label>
          <div className="col-md col-12">
            <input
              className="form-control"
              type="number"
              id="limit"
              name="limit"
              min="0"
              value={state.fields.limit}
              onChange={handleChange}
            />
          </div>
          <label className="col-auto col-form-label" htmlFor="ticketing">Ticketing</label>
          <div className="col-md col-12">
            <Select
              inputId="ticketing"
              name="ticketing"
              options={ticketingOptions}
              className="select-container"
              classNamePrefix="select"
              value={ticketingOptions.find(({ value }) => value === state.fields.ticketing)}
              onChange={({ value }) => dispatch({
                type: 'change',
                name: 'ticketing',
                value,
                valid: null,
              })}
            />
          </div>
        </div>
        <div className="row form-group">
          <label className="col-auto col-form-label" htmlFor="startDate">Date</label>
          <div className="input-group col-md col-12">
            <div className="input-group-prepend">
              <div className="btn-group" role="group">
                <button type="button" name="startDate" value="today" onClick={handleChange} aria-pressed={state.fields.startDate === 'today'} className={['btn', 'btn-outline-secondary', state.fields.startDate === 'today' ? 'active' : ''].join(' ')}>Today</button>
                <button type="button" name="startDate" value="tomorrow" onClick={handleChange} aria-pressed={state.fields.startDate === 'tomorrow'} className={['btn', 'btn-outline-secondary', state.fields.startDate === 'tomorrow' ? 'active' : ''].join(' ')}>Tomorrow</button>
                <button type="button" name="startDate" value={dayAfterTomorrow} onClick={handleChange} aria-pressed={customStartDate} className={['btn', 'btn-outline-secondary', 'rounded-0', customStartDate ? 'active' : ''].join(' ')}>Other</button>
              </div>
            </div>
            <input
              className="form-control"
              type="date"
              id="startDate"
              name="startDate"
              min={today}
              value={customStartDate ? state.fields.startDate : ''}
              disabled={!customStartDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </form>
      {showtimes}
    </Layout>
  );
}

export default Index;
