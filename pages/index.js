import { useReducer, useEffect, useRef, useMemo, Fragment } from 'react';
import Router from 'next/router';
import { Subject, EMPTY } from 'rxjs';
import { switchMap, distinctUntilChanged, catchError } from 'rxjs/operators';
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
    movie: 'include',
    movies: [],
    amenitiesInclude: [],
    amenitiesExclude: [],
    featuresInclude: [],
    featuresExclude: [],
  },
  valid: false,
  showtimes: [],
  movies: [],
  amenities: [],
  features: [],
  searchParsed: false,
  status: 'waiting',
  error: null,
};

/**
 * Take an existing list and a new list and merge them updating
 * the existing items and adding new items, but not discarding anything.
 *
 * @param {array} existingList
 * @param {array} newList
 *
 * @return {array}
 */
function mergeList(existingList, newList) {
  const map = new Map();

  existingList.forEach(item => map.set(item['@id'], item));
  newList.forEach(item => map.set(item['@id'], item));


  return [...map.values()];
}

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
        status: 'ready',
        showtimes: action.showtimes,
        movies: mergeList(state.movies, action.movies),
        amenities: mergeList(state.amenities, action.amenities),
        features: mergeList(state.features, action.features),
      };
    case 'status':
      return {
        ...state,
        status: action.status,
      };
    case 'error':
      return {
        ...state,
        status: 'error',
        error: action.error,
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

function getOptions(list, field) {
  const items = list.map(item => ({
    label: item.name,
    value: item['@id'].split('/').pop(),
  }));

  // Ensure that all of the values are in the options, if not, add them.
  return [
    ...items,
    ...field.reduce((acc, id) => {
      if (items.find(i => i.value === id)) {
        return acc;
      }

      return [
        ...acc,
        {
          label: id,
          value: id,
        },
      ];
    }, []),
  ];
}

const query = (new Subject()).pipe(
  distinctUntilChanged((z, y) => (
    z.zipCode === y.zipCode
    && z.limit === y.limit
    && z.ticketing === y.ticketing
    && z.startDate === y.startDate
  )),
  switchMap(({ dispatch, ...q }) => {
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

    dispatch({
      type: 'status',
      status: 'fetching',
    });

    // @TODO handle an error!
    return ajax.getJSON(url.toString()).pipe(
      catchError((error) => {
        dispatch({ type: 'error', error });
        return EMPTY;
      }),
    );
  }),
);

async function resultFilter(result, type) {
  const data = await frame(result, {
    '@context': {
      '@vocab': 'https://schema.org/',
      cinematix: 'https://cinematix.app/',
    },
    '@type': type,
  });

  return data['@graph'] || [];
}

function displayFilter(include, exclude, data) {
  if (include.length !== 0) {
    if (!data) {
      return false;
    }

    const match = include.find((id) => {
      if (Array.isArray(data)) {
        return data.find(a => a['@id'].split('/').pop() === id);
      }

      return data['@id'].split('/').pop() === id;
    });

    if (!match) {
      return false;
    }
  }

  if (exclude.length !== 0) {
    if (!data) {
      return true;
    }

    const match = exclude.find((id) => {
      if (Array.isArray(data)) {
        return data.find(a => a['@id'].split('/').pop() === id);
      }

      return data['@id'].split('/').pop() === id;
    });

    if (match) {
      return false;
    }
  }

  return true;
}


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

  const handleListChange = list => (
    data => dispatch({
      type: 'change',
      name: list,
      value: data ? data.map(({ value }) => value) : [],
      valid: null,
    })
  );

  // Update the query
  // @TODO Pass this in with server rendering!
  useEffect(() => {
    if (!state.searchParsed && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      [...url.searchParams.keys()].forEach((name) => {
        if (typeof initialState.fields[name] === 'undefined') {
          return;
        }
      
        dispatch({
          type: 'change',
          name,
          value: Array.isArray(initialState.fields[name]) ? url.searchParams.getAll(name) : url.searchParams.get(name),
          valid: null,
        });
      });
  
      dispatch({ type: 'searchParsed' });
    }
  }, []);

  // Subscribe the query changes and dispatch the results.
  useEffect(() => {
    query.subscribe(async (data) => {
      const [showtimes, movies, amenities, products] = await Promise.all([
        resultFilter(data, 'ScreeningEvent'),
        resultFilter(data, 'Movie'),
        resultFilter(data, 'LocationFeatureSpecification'),
        resultFilter(data, 'Product'),
      ]);

      const properties = new Map();

      products.forEach(({ additionalProperty }) => {
        if (!additionalProperty) {
          return;
        }

        if (Array.isArray(additionalProperty)) {
          additionalProperty.forEach((property) => {
            properties.set(property['@id'], property);
          });
        } else {
          properties.set(additionalProperty['@id'], additionalProperty);
        }
      });

      dispatch({
        type: 'result',
        showtimes,
        movies,
        amenities,
        features: [...properties.values()],
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
      dispatch,
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
        if (Array.isArray(state.fields[name])) {
          searchParams.delete(name);
          state.fields[name].forEach(v => searchParams.append(name, v));
        } else {
          searchParams.set(name, state.fields[name]);
        }
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
    state.fields.movie,
    state.fields.movies,
    state.fields.amenitiesInclude,
    state.fields.amenitiesExclude,
    state.fields.featuresInclude,
    state.fields.featuresExclude,
  ]);

  const now = DateTime.local();
  const today = now.toFormat('yyyy-MM-dd');

  const showtimes = useMemo(() => {
    if (state.status === 'error') {
      return (
        <div className="alert alert-danger" role="alert">
          An error occured with the request to <a href={state.error.request.url} className="alert-link">{state.error.request.url}</a>
        </div>
      );
    }

    const rows = [...(state.showtimes || [])].filter(({ offers, workPresented, location }) => {
      if (offers.availability === 'https://schema.org/Discontinued') {
        return false;
      }

      if (state.fields.movies.length !== 0) {
        const match = state.fields.movies.includes(workPresented['@id'].split('/').pop());

        if (state.fields.movie === 'exclude' && match) {
          return false;
        }
        if (state.fields.movie === 'include' && !match) {
          return false;
        }
      }

      if (!displayFilter(state.fields.amenitiesInclude, state.fields.amenitiesExclude, location.amenityFeature)) {
        return false;
      }

      if (!displayFilter(state.fields.featuresInclude, state.fields.featuresExclude, offers.itemOffered.additionalProperty)) {
        return false;
      }

      return true;
    }).sort((a, b) => (
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
        <div key={showtime['@id']} className="row align-items-center mb-2 mb-md-0">
          <div className="col-md-4 mb-2">
            {movieDisplay}
          </div>
          <div className="col-md-4 mb-2">
            {theaterDisplay}
          </div>
          <div className="col-md-4 mb-2">
            <a className={className.join(' ')} href={showtime.offers.url}>
              <time dateTime={startDate.toISO()}>
                {startDate.toLocaleString(timeFormat)}
              </time>
            </a>
          </div>
        </div>
      );
    });

    if (!rows) {
      return null;
    }

    return (
      <Fragment>
        <div className="row border-bottom d-none mb-2 d-md-flex">
          <h5 className="col-md-4">
            Movie
          </h5>
          <h5 className="col-md-4">
            Theater
          </h5>
          <h5 className="col-md-4">
            Showtime
          </h5>
        </div>
        {rows}
      </Fragment>
    );
  }, [
    state.status,
    state.error,
    state.showtimes,
    state.fields.movie,
    state.fields.movies,
    state.fields.amenitiesInclude,
    state.fields.amenitiesExclude,
    state.fields.featuresInclude,
    state.fields.featuresExclude,
  ]);

  const customStartDate = !['today', 'tomorrow'].includes(state.fields.startDate);

  const dayAfterTomorrow = now.plus({ days: 2 }).toFormat('yyyy-MM-dd');

  const movieOptions = useMemo(() => getOptions(state.movies, state.fields.movies), [state.movies, state.fields.movies]);
  const amenitiesIncludeOptions = useMemo(() => getOptions(state.amenities, state.fields.amenitiesInclude), [state.amenities, state.fields.amenitiesInclude]);
  const amenitiesExcludeOptions = useMemo(() => getOptions(state.amenities, state.fields.amenitiesExclude), [state.amenities, state.fields.amenitiesExclude]);
  const featuresIncludeOptions = useMemo(() => getOptions(state.features, state.fields.featuresInclude), [state.features, state.fields.featuresInclude]);
  const featuresExcludeOptions = useMemo(() => getOptions(state.features, state.fields.featuresExclude), [state.features, state.fields.featuresExclude]);

  return (
    <Layout>
      <form ref={formRef} onSubmit={e => e.preventDefault()}>
        <div className="row form-group">
          <label className="col-1 col-form-label text-nowrap" htmlFor="zipCode">Zip Code</label>
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
          <label className="col-auto col-form-label text-nowrap" htmlFor="limit">Max. Theaters</label>
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
          <label className="col-1 col-form-label" htmlFor="startDate">Date</label>
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
        {/* @TODO Put the theater filter here. */}
        <div className="row form-group">
          <span className="col-1 col-form-label" htmlFor="amenities">Amenities</span>
          <div className="col-md col-12 mb-2 mb-md-0 pr-md-0 input-group flex-nowrap align-items-stretch">
            <div className="input-group-prepend">
              <label className="input-group-text" htmlFor="amenitiesInclude">Include</label>
            </div>
            <Select
              inputId="amenitiesInclude"
              name="amenitiesInclude"
              options={amenitiesIncludeOptions}
              className={['select-container', 'rounded-0', 'align-self-stretch'].join(' ')}
              classNamePrefix="select"
              value={state.fields.amenitiesInclude.map(id => amenitiesIncludeOptions.find(({ value }) => id === value))}
              onChange={handleListChange('amenitiesInclude')}
              isMulti
            />
          </div>
          <div className="col-md col-12 mb-2 mb-md-0 pl-md-0 input-group flex-nowrap align-items-stretch">
            <div className="input-group-prepend">
              <label className="input-group-text rounded-0" htmlFor="amenitiesExclude">Exclude</label>
            </div>
            <Select
              inputId="amenitiesExclude"
              name="amenitiesExclude"
              options={amenitiesIncludeOptions}
              className={['select-container', 'rounded-left-0', 'align-self-stretch'].join(' ')}
              classNamePrefix="select"
              value={state.fields.amenitiesExclude.map(id => amenitiesExcludeOptions.find(({ value }) => id === value))}
              onChange={handleListChange('amenitiesExclude')}
              isMulti
            />
          </div>
        </div>
        <div className="row form-group">
          <label className="col-1 col-form-label" htmlFor="movies">Movies</label>
          <div className="input-group col-md col-12 flex-nowrap">
            <div className="input-group-prepend">
              <div className="btn-group" role="group">
                <button type="button" name="movie" value="include" onClick={handleChange} aria-pressed={state.fields.movie === 'include'} className={['btn', 'btn-outline-secondary', state.fields.movie === 'include' ? 'active' : ''].join(' ')}>Include</button>
                <button type="button" name="movie" value="exclude" onClick={handleChange} aria-pressed={state.fields.movie === 'exclude'} className={['btn', 'btn-outline-secondary', 'rounded-0', state.fields.movie === 'exclude' ? 'active' : ''].join(' ')}>Exclude</button>
              </div>
            </div>
            <Select
              inputId="movies"
              name="movies"
              options={movieOptions}
              className={['select-container', 'rounded-left-0'].join(' ')}
              classNamePrefix="select"
              value={state.fields.movies.map(id => movieOptions.find(({ value }) => id === value))}
              onChange={handleListChange('movies')}
              isMulti
            />
          </div>
        </div>
        <div className="row form-group">
          <span className="col-1 col-form-label" htmlFor="features">Features</span>
          <div className="col-md col-12 mb-2 mb-md-0 pr-md-0 input-group flex-nowrap align-items-stretch">
            <div className="input-group-prepend">
              <label className="input-group-text" htmlFor="featuresInclude">Include</label>
            </div>
            <Select
              inputId="featuresInclude"
              name="featuresInclude"
              options={featuresIncludeOptions}
              className={['select-container', 'rounded-0', 'align-self-stretch'].join(' ')}
              classNamePrefix="select"
              value={state.fields.featuresInclude.map(id => featuresIncludeOptions.find(({ value }) => id === value))}
              onChange={handleListChange('featuresInclude')}
              isMulti
            />
          </div>
          <div className="col-md col-12 mb-2 mb-md-0 pl-md-0 input-group flex-nowrap align-items-stretch">
            <div className="input-group-prepend">
              <label className="input-group-text rounded-0" htmlFor="featuresExclude">Exclude</label>
            </div>
            <Select
              inputId="featuresExclude"
              name="featuresExclude"
              options={featuresExcludeOptions}
              className={['select-container', 'rounded-left-0', 'align-self-stretch'].join(' ')}
              classNamePrefix="select"
              value={state.fields.featuresExclude.map(id => featuresExcludeOptions.find(({ value }) => id === value))}
              onChange={handleListChange('featuresExclude')}
              isMulti
            />
          </div>
        </div>
      </form>
      {showtimes}
    </Layout>
  );
}

export default Index;
