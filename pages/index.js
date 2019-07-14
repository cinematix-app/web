import {
  useReducer,
  useEffect,
  useRef,
  useMemo,
  Fragment,
} from 'react';
import Router from 'next/router';
import {
  Subject,
  of,
  merge,
  forkJoin,
} from 'rxjs';
import {
  switchMap,
  flatMap,
  distinctUntilChanged,
  catchError,
  debounceTime,
  map,
  filter,
} from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';
import { DateTime } from 'luxon';
import { frame } from 'jsonld';
import Select from 'react-select';
import Layout from '../components/layout';

const initialState = {
  fields: {
    zipCode: '',
    limit: '5',
    ticketing: 'both',
    startDate: 'today',
    theater: 'include',
    theaters: [],
    movie: 'include',
    movies: [],
    props: [],
    propsx: [],
  },
  showtimes: [],
  theaters: [],
  movies: [],
  props: [],
  search: {
    theaters: {
      fetching: false,
      result: [],
    },
    movies: {
      fetching: false,
      result: [],
    },
  },
  searchParsed: false,
  status: 'waiting',
  error: null,
};

const context = {
  '@vocab': 'https://schema.org/',
  x: 'https://cinematix.app/',
  xa: 'https://cinematix.app/amenity/',
  xf: 'https://cinematix.app/format/',
  xg: 'https://cinematix.app/genre/',
  xm: 'https://cinematix.app/movie/',
  xp: 'https://cinematix.app/property/',
  xr: 'https://cinematix.app/rating/',
  xs: 'https://cinematix.app/showtime/',
  xt: 'https://cinematix.app/theater/',
};

function toArray(value) {
  if (typeof value === 'undefined') {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

const replaceContext = [...Object.entries(context)].sort(([, a], [, b]) => (
  b.length - a.length
));

function textToCollection(text, data) {
  return [...toArray(text)].map((value) => {
    const id = replaceContext.reduce((acc, [key, url]) => (
      acc.replace(url, `${key}:`)
    ), value);

    return data.find(obj => obj['@id'] === id);
  });
}

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
  const list = new Map();

  existingList.forEach(item => list.set(item['@id'], item));
  newList.forEach(item => list.set(item['@id'], item));


  return [...list.values()];
}

function resultReducer(state, action) {
  if (action.type !== 'result') {
    return state;
  }

  const theaters = mergeList(state.theaters, action.theaters || []);
  const movies = mergeList(state.movies, action.movies || []);
  const props = mergeList(state.props, action.props || []);

  return {
    ...state,
    status: 'ready',
    showtimes: (action.showtimes || []).map(showtime => (
      {
        ...showtime,
        props: [
          ...toArray(showtime.location.amenityFeature),
          ...toArray(showtime.offers.itemOffered.additionalProperty),
          ...textToCollection(showtime.workPresented.genre, props),
          ...textToCollection(showtime.videoFormat, props),
          ...textToCollection(showtime.workPresented.contentRating, props),
        ],
      }
    )),
    theaters,
    movies,
    props,
  };
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
      };
    case 'result':
      return resultReducer(state, action);
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
    case 'searchFetch':
      return {
        ...state,
        search: {
          ...state.search,
          [action.field]: {
            ...state.search[action.field],
            fetching: true,
          },
        },
      };
    case 'searchResult':
      return {
        ...state,
        search: {
          ...state.search,
          [action.field]: {
            fetching: false,
            result: action.result || [],
          },
        },
      };
    case 'searchParsed':
      return {
        ...state,
        fields: {
          ...state.fields,
          ...action.search,
        },
        searchParsed: true,
      };
    default:
      throw new Error();
  }
}

function getOptions(list, field, searchResult = []) {
  const options = new Map();

  list.forEach(item => options.set(item['@id'].split(':').pop(), item.name));

  searchResult.forEach(({ value, label }) => {
    if (!options.has(value)) {
      options.set(value, label);
    }
  });

  field.forEach((id) => {
    if (!options.has(id)) {
      options.set(id, id);
    }
  });

  return [...options.entries()].map(([value, label]) => ({
    label,
    value,
  }));
}

function getGroupLabel(key) {
  switch (key) {
    case 'xa':
      return 'Theater Amenity';
    case 'xf':
      return 'Movie Format';
    case 'xg':
      return 'Movie Genre';
    case 'xp':
      return 'Showtime Feature';
    case 'xr':
      return 'Movie Rating';
    default:
      return '';
  }
}

async function resultFilter(result, type) {
  const data = await frame(result, {
    '@context': context,
    '@type': type,
  });

  return data['@graph'] || [];
}

function getPropOptions(list, field) {
  const groups = new Map();

  list.forEach((item) => {
    const type = item['@id'].split(':').shift();
    const set = groups.get(type) || new Set();
    set.add({
      label: item.name,
      value: item['@id'],
    });
    groups.set(type, set);
  });

  // Ensure that all of the values are in the options, if not, add them.
  field.forEach((id) => {
    const type = id.split(':').shift();
    const set = groups.get(type) || new Set();
    set.add({
      label: id,
      value: id,
    });
    groups.set(type, set);
  });

  return [...groups.entries()].map(([group, options]) => ({
    label: getGroupLabel(group),
    options: [...options.values()],
  }));
}

function getPropValue(list, field) {
  return field.map((id) => {
    for (let i = 0; i < list.length; i += 1) {
      const option = list[i].options.find(({ value }) => id === value);
      if (option) {
        return option;
      }
    }

    return undefined;
  });
}

const query = (new Subject()).pipe(
  distinctUntilChanged((z, y) => (
    z.zipCode === y.zipCode
    && z.limit === y.limit
    && z.ticketing === y.ticketing
    && z.startDate === y.startDate
    && z.theaters === y.theaters
  )),
  switchMap((q) => {
    const url = new URL('https://cinematix.app/api/showtimes');

    if (q.theaters.length > 0) {
      q.theaters.forEach(id => url.searchParams.append('theaters', id));
    } else if (q.zipCode.length > 2) {
      url.searchParams.set('zipCode', q.zipCode.padStart(5, '0'));

      ['limit', 'ticketing'].forEach((field) => {
        if (q[field] !== initialState.fields[field]) {
          url.searchParams.set(field, q[field]);
        }
      });
    } else {
      return of({
        type: 'result',
      });
    }

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

    return merge(
      of({
        type: 'status',
        status: 'fetching',
      }),
      ajax.getJSON(url.toString()).pipe(
        flatMap(data => (
          forkJoin([
            resultFilter(data, 'ScreeningEvent'),
            resultFilter(data, 'MovieTheater'),
            resultFilter(data, 'Movie'),
            resultFilter(data, ['x:Genre', 'x:Rating', 'x:Amenity', 'x:Format', 'x:Property']),
          ]).pipe(
            map(([showtimes, theaters, movies, props]) => ({
              type: 'result',
              showtimes,
              theaters,
              movies,
              props,
            })),
          )
        )),
        catchError(error => of({
          type: 'error',
          error,
        })),
      ),
    );
  }),
);

function createPropertySearch(type, id) {
  return (new Subject()).pipe(
    filter(v => !!v),
    distinctUntilChanged((z, y) => z === y),
    debounceTime(250),
    switchMap((value) => {
      const url = new URL('https://www.wikidata.org/w/api.php');
      url.searchParams.set('action', 'query');
      url.searchParams.set('format', 'json');
      url.searchParams.set('list', 'search');
      url.searchParams.set('formatversion', 2);
      url.searchParams.set('srinfo', '');
      url.searchParams.set('srprop', '');
      url.searchParams.set('srenablerewrites', 1);
      url.searchParams.set('origin', '*');
      url.searchParams.set('srsearch', `${id} ${value}`);

      return merge(
        of({
          type: 'searchFetch',
          field: type,
        }),
        ajax.getJSON(url.toString()).pipe(
          flatMap((data) => {
            if (!data.query) {
              return of({
                type: 'searchResult',
                field: type,
              });
            }

            if (!data.query.search || data.query.search.length === 0) {
              return of({
                type: 'searchResult',
                field: type,
              });
            }

            // Labels.
            const labelUrl = new URL('https://www.wikidata.org/w/api.php');
            labelUrl.searchParams.set('action', 'wbgetentities');
            labelUrl.searchParams.set('format', 'json');
            labelUrl.searchParams.set('origin', '*');
            labelUrl.searchParams.set('formatversion', 2);
            labelUrl.searchParams.set('ids', data.query.search.map(({ title }) => title).join('|'));
            labelUrl.searchParams.set('languages', 'en');

            const entityLabels = ajax.getJSON(labelUrl.toString());

            const entityClaims = forkJoin(data.query.search.map(({ title }) => {
              const claimUrl = new URL('https://www.wikidata.org/w/api.php');
              claimUrl.searchParams.set('action', 'wbgetclaims');
              claimUrl.searchParams.set('format', 'json');
              claimUrl.searchParams.set('origin', '*');
              claimUrl.searchParams.set('formatversion', 2);
              claimUrl.searchParams.set('entity', title);
              claimUrl.searchParams.set('property', id);
              claimUrl.searchParams.set('props', '');

              return forkJoin([of(title), ajax.getJSON(claimUrl.toString())]);
            }));

            return forkJoin([entityLabels, entityClaims]).pipe(
              map(([labels, claimCollection]) => {
                const result = claimCollection.reduce((acc, [entityId, claimSet]) => {
                  if (
                    !claimSet
                    || !claimSet.claims
                    || !claimSet.claims[id]
                  ) {
                    return acc;
                  }

                  // Remove deprecated and sort by prefered.
                  const claims = claimSet.claims[id].filter(c => c.type !== 'deprecated').sort((a, b) => {
                    if (a.rank === 'preferred') {
                      return 1;
                    }

                    if (b.rank === 'preferred') {
                      return -1;
                    }

                    return 0;
                  });

                  if (claims.length === 0) {
                    return acc;
                  }

                  const claimValue = claims.pop().mainsnak.datavalue.value.toUpperCase();

                  let label;
                  if (
                    labels
                    && labels.entities
                    && labels.entities[entityId]
                    && labels.entities[entityId].labels
                    && labels.entities[entityId].labels.en
                    && labels.entities[entityId].labels.en.value
                  ) {
                    label = labels.entities[entityId].labels.en.value;
                  } else {
                    label = claimValue;
                  }

                  return [
                    ...acc,
                    {
                      label,
                      value: claimValue,
                    },
                  ];
                }, []);

                return {
                  type: 'searchResult',
                  field: type,
                  result,
                };
              }),
            );
          }),
          catchError(() => (
            of({
              type: 'searchResult',
              field: type,
            })
          )),
        ),
      );
    }),
  );
}

const theaterSearch = createPropertySearch('theaters', 'P6644');
const movieSearch = createPropertySearch('movies', 'P5693');

function displayFilter(include, exclude, data) {
  if (include.length !== 0) {
    if (!data) {
      return false;
    }

    const match = include.find((id) => {
      if (Array.isArray(data)) {
        return data.find(a => a['@id'] === id);
      }

      return data['@id'];
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
        return data.find(a => a['@id'] === id);
      }

      return data['@id'] === id;
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

const propKeys = ['props', 'propsx'];

function Index() {
  const formRef = useRef(null);
  const [state, dispatch] = useReducer(reducer, initialState);

  const locationDisabled = state.fields.theater === 'include' && state.fields.theaters.length > 0;

  const locaitonFields = [
    'zipCode',
    'limit',
    'ticketing',
  ];

  const handleChange = ({ target }) => {
    dispatch({
      type: 'change',
      name: target.name,
      value: target.type === 'checkbox' ? target.checked : target.value,
    });
  };

  const handleListChange = list => (
    data => dispatch({
      type: 'change',
      name: list,
      value: data ? data.map(({ value }) => value) : [],
    })
  );

  const createInputHandler = (type) => {
    let search;
    switch (type) {
      case 'theaters':
        search = theaterSearch;
        break;
      case 'movies':
        search = movieSearch;
        break;
      default:
        throw new Error('Unknown Type');
    }

    return input => search.next(input);
  };

  useEffect(() => {
    const querySub = query.subscribe(action => dispatch(action));
    const theaterSub = theaterSearch.subscribe(action => dispatch(action));
    const movieSub = movieSearch.subscribe(action => dispatch(action));

    return () => {
      querySub.unsubscribe();
      theaterSub.unsubscribe();
      movieSub.unsubscribe();
    };
  }, []);

  // Update the query
  // @TODO Pass this in with server rendering!
  useEffect(() => {
    if (!state.searchParsed && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const search = [...url.searchParams.keys()].reduce((acc, name) => {
        if (typeof initialState.fields[name] === 'undefined') {
          return acc;
        }

        let value;
        if (Array.isArray(initialState.fields[name])) {
          value = url.searchParams.getAll(name);
          if (propKeys.includes(name)) {
            value = value.map(v => v.replace('.', ':'));
          }
        } else {
          value = url.searchParams.get(name);
        }

        return {
          ...acc,
          [name]: value,
        };
      }, {});

      dispatch({
        type: 'searchParsed',
        search,
      });
    }
  }, []);

  // Update the query.
  useEffect(() => {
    const {
      zipCode,
      limit,
      ticketing,
      startDate,
      theater,
      theaters,
    } = state.fields;

    query.next({
      zipCode,
      limit,
      ticketing,
      startDate,
      theaters: theater === 'include' ? theaters : [],
      dispatch,
    });
  }, [
    state.fields.zipCode,
    state.fields.limit,
    state.fields.ticketing,
    state.fields.startDate,
    state.fields.theater,
    state.fields.theaters,
  ]);

  // Update the route.
  useEffect(() => {
    // Wait for the search to be parsed.
    if (!state.searchParsed) {
      return;
    }

    const searchParams = new URLSearchParams();
    Object.keys(state.fields).forEach((name) => {
      if (locationDisabled && locaitonFields.includes(name)) {
        searchParams.delete(name);
      } else if (state.fields[name] !== initialState.fields[name] && state.fields[name] !== '') {
        if (Array.isArray(state.fields[name])) {
          searchParams.delete(name);
          state.fields[name].forEach(v => (
            searchParams.append(name, propKeys.includes(name) ? v.replace(':', '.') : v)
          ));
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
    locationDisabled,
    state.fields.zipCode,
    state.fields.limit,
    state.fields.ticketing,
    state.fields.startDate,
    state.fields.theater,
    state.fields.theaters,
    state.fields.movie,
    state.fields.movies,
    state.fields.props,
    state.fields.propsx,
  ]);

  const now = DateTime.local();
  const today = now.toFormat('yyyy-MM-dd');

  const movieOptions = useMemo(
    () => getOptions(state.movies, state.fields.movies, state.search.movies.result),
    [state.movies, state.fields.movies, state.search.movies.result],
  );

  const theaterOptions = useMemo(
    () => getOptions(state.theaters, state.fields.theaters, state.search.theaters.result),
    [state.theaters, state.fields.theaters, state.search.theaters.result],
  );

  const propsOptions = useMemo(
    () => getPropOptions(state.props, state.fields.props),
    [state.props, state.fields.props],
  );
  const propsxOptions = useMemo(
    () => getPropOptions(state.props, state.fields.propsx),
    [state.props, state.fields.propsx],
  );

  const showtimes = useMemo(() => {
    if (state.status === 'error') {
      return (
        <div className="alert alert-danger" role="alert">
          An error occured with the request to <a href={state.error.request.url} className="alert-link">{state.error.request.url}</a>
        </div>
      );
    }

    let options = [];
    if (state.fields.props.length > 1) {
      options = [
        ...options,
        ...getPropValue(propsOptions, state.fields.props),
      ];
    }


    let movieWidth = 4;
    let theaterWidth = 4;
    let showtimeWidth = 4;
    const optionsLimit = options.length > 6 ? 6 : options.length;
    switch (optionsLimit) {
      case 2:
        showtimeWidth -= 1;
        movieWidth -= 1;
        break;
      case 3:
        showtimeWidth -= 1;
        movieWidth -= 1;
        theaterWidth -= 1;
        break;
      case 4:
        showtimeWidth -= 2;
        movieWidth -= 1;
        theaterWidth -= 1;
        break;
      case 5:
        showtimeWidth -= 2;
        movieWidth -= 2;
        theaterWidth -= 1;
        break;
      case 6:
        showtimeWidth -= 2;
        movieWidth -= 2;
        theaterWidth -= 2;
        break;
      default:
        break;
    }

    const rows = [...(state.showtimes || [])].filter(({
      location,
      offers,
      workPresented,
      props,
    }) => {
      if (offers.availability === 'https://schema.org/Discontinued') {
        return false;
      }

      if (state.fields.movies.length !== 0) {
        const match = state.fields.movies.includes(workPresented['@id'].split(':').pop());

        if (state.fields.movie === 'exclude' && match) {
          return false;
        }
        if (state.fields.movie === 'include' && !match) {
          return false;
        }
      }

      if (state.fields.theaters.length !== 0) {
        const match = state.fields.theaters.includes(location['@id'].split(':').pop());

        if (state.fields.theater === 'exclude' && match) {
          return false;
        }
        if (state.fields.theater === 'include' && !match) {
          return false;
        }
      }

      if (!displayFilter(
        state.fields.props,
        state.fields.propsx,
        props,
      )) {
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

      let optionsDisplay;
      if (optionsLimit > 1) {
        optionsDisplay = options.slice(0, optionsLimit).map((option) => {
          let checkMark;

          if (showtime.props.find(obj => obj['@id'] === option.value)) {
            checkMark = (
              <div className="mb-2">
                <img src="static/baseline-check_circle-24px.svg" alt={option.label} /><span className="d-md-none"> {option.label}</span>
              </div>
            );
          }

          return (
            <div key={option.value} className="col-md-1 text-left text-md-center">
              {checkMark}
            </div>
          );
        });
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
          <div className={`col-md-${movieWidth} mb-2`}>
            {movieDisplay}
          </div>
          <div className={`col-md-${theaterWidth} mb-2`}>
            {theaterDisplay}
          </div>
          {optionsDisplay}
          <div className={`col-md-${showtimeWidth} mb-2`}>
            <a className={className.join(' ')} href={showtime.offers.url}>
              <time dateTime={startDate.toISO()}>
                {startDate.toLocaleString(timeFormat)}
              </time>
            </a>
          </div>
        </div>
      );
    });

    if (rows.length === 0) {
      return null;
    }

    let optionsDisplay;
    if (optionsLimit > 1) {
      optionsDisplay = options.slice(0, optionsLimit).map(option => (
        <div key={option.value} className="col-md-1 mb-2 text-center text-break">
          {option.label}
        </div>
      ));
    }

    return (
      <Fragment>
        <div className="row border-bottom d-none mb-2 d-md-flex align-items-end">
          <h5 className={`col-md-${movieWidth}`}>
            Movie
          </h5>
          <h5 className={`col-md-${theaterWidth}`}>
            Theater
          </h5>
          {optionsDisplay}
        </div>
        {rows}
      </Fragment>
    );
  }, [
    state.status,
    state.error,
    state.showtimes,
    state.fields.theater,
    state.fields.theaters,
    state.fields.movie,
    state.fields.movies,
    state.fields.props,
    state.fields.propsx,
  ]);

  const customStartDate = !['today', 'tomorrow'].includes(state.fields.startDate);

  const dayAfterTomorrow = now.plus({ days: 2 }).toFormat('yyyy-MM-dd');

  return (
    <Layout>
      <form ref={formRef} onSubmit={e => e.preventDefault()}>
        <div className="row form-group">
          <label className="col-2 col-lg-1 col-form-label text-nowrap" htmlFor="zipCode">Zip Code</label>
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
              disabled={locationDisabled}
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
              disabled={locationDisabled}
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
              })}
              isDisabled={locationDisabled}
            />
          </div>
        </div>
        <div className="row form-group">
          <label className="col-2 col-lg-1 col-form-label" htmlFor="startDate">Date</label>
          <div className="input-group col-md col-12 flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <div className="btn-group w-100 w-md-auto" role="group">
                <button type="button" name="startDate" value="today" onClick={handleChange} aria-pressed={state.fields.startDate === 'today'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.startDate === 'today' ? 'active' : ''].join(' ')}>Today</button>
                <button type="button" name="startDate" value="tomorrow" onClick={handleChange} aria-pressed={state.fields.startDate === 'tomorrow'} className={['btn', 'btn-outline-secondary', state.fields.startDate === 'tomorrow' ? 'active' : ''].join(' ')}>Tomorrow</button>
                <button type="button" name="startDate" value={dayAfterTomorrow} onClick={handleChange} aria-pressed={customStartDate} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', customStartDate ? 'active' : ''].join(' ')}>Other</button>
              </div>
            </div>
            <input
              className="form-control rounded-bottom rounded-top-0 rounded-md-left-0 rounded-md-right"
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
        <div className="row form-group">
          <label className="col-2 col-lg-1 col-form-label" htmlFor="theaters">Theaters</label>
          <div className="input-group col-md col-12 flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <div className="btn-group w-100 w-md-auto" role="group">
                <button type="button" name="theater" value="include" onClick={handleChange} aria-pressed={state.fields.theater === 'include'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.theater === 'include' ? 'active' : ''].join(' ')}>Include</button>
                <button type="button" name="theater" value="exclude" onClick={handleChange} aria-pressed={state.fields.theater === 'exclude'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', state.fields.theater === 'exclude' ? 'active' : ''].join(' ')}>Exclude</button>
              </div>
            </div>
            <Select
              inputId="theaters"
              name="theaters"
              options={theaterOptions}
              className="select-container rounded-bottom rounded-top-0 rounded-md-left-0 rounded-md-right"
              classNamePrefix="select"
              value={state.fields.theaters.map(
                id => theaterOptions.find(({ value }) => id === value),
              )}
              onChange={handleListChange('theaters')}
              onInputChange={createInputHandler('theaters')}
              isLoading={state.search.theaters.fetching}
              isMulti
            />
          </div>
        </div>
        <div className="row form-group">
          <label className="col-2 col-lg-1 col-form-label" htmlFor="movies">Movies</label>
          <div className="input-group col-md col-12 flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <div className="btn-group w-100 w-md-auto" role="group">
                <button type="button" name="movie" value="include" onClick={handleChange} aria-pressed={state.fields.movie === 'include'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.movie === 'include' ? 'active' : ''].join(' ')}>Include</button>
                <button type="button" name="movie" value="exclude" onClick={handleChange} aria-pressed={state.fields.movie === 'exclude'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', state.fields.movie === 'exclude' ? 'active' : ''].join(' ')}>Exclude</button>
              </div>
            </div>
            <Select
              inputId="movies"
              name="movies"
              options={movieOptions}
              className="select-container rounded-bottom rounded-top-0 rounded-md-left-0 rounded-md-right"
              classNamePrefix="select"
              value={state.fields.movies.map(id => movieOptions.find(({ value }) => id === value))}
              onChange={handleListChange('movies')}
              onInputChange={createInputHandler('movies')}
              isLoading={state.search.movies.fetching}
              isMulti
            />
          </div>
        </div>
        <div className="row form-group">
          <span className="col-2 col-lg-1 col-form-label">Properties</span>
          <div className="col-md col-12 mb-2 mb-md-0 pr-md-0 input-group align-items-stretch flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left" htmlFor="props">Include</label>
            </div>
            <Select
              inputId="props"
              name="props"
              options={propsOptions}
              className={['select-container', 'rounded-0', 'align-self-stretch'].join(' ')}
              classNamePrefix="select"
              value={getPropValue(propsOptions, state.fields.props)}
              onChange={handleListChange('props')}
              isMulti
            />
          </div>
          <div className="col-md col-12 mb-2 mb-md-0 pl-md-0 input-group align-items-stretch flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left-0" htmlFor="propsx">Exclude</label>
            </div>
            <Select
              inputId="propsx"
              name="propsx"
              options={propsxOptions}
              className={['select-container', 'rounded-top-0', 'rounded-md-left-0', 'rounded-md-right', 'align-self-stretch'].join(' ')}
              classNamePrefix="select"
              value={getPropValue(propsxOptions, state.fields.propsx)}
              onChange={handleListChange('propsx')}
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
