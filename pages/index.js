import {
  useReducer,
  useEffect,
  useMemo,
} from 'react';
import Router from 'next/router';
import { of, timer } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { DateTime } from 'luxon';
import useReactor from '@cinematix/reactor';
import ReducerContext from '../context/reducer';
import Layout from '../components/layout';
import Status from '../components/status';
import Showtimes from '../components/showtimes';
import Form from '../components/form';
import dateFormat from '../utils/date-format';
import createQueryReactor from '../reactors/query';
import context from '../utils/context';

const initialState = {
  fields: {
    zipCode: '',
    limit: '5',
    ticketing: 'both',
    startDate: 'today',
    startTime: '',
    endDate: 'today',
    endTime: '',
    theater: 'include',
    theaters: [],
    movie: 'include',
    movies: [],
    props: [],
    propsx: [],
  },
  today: null,
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

const queryReactor = createQueryReactor(initialState);

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

/**
 * Get DateTime
 *
 * @param {string} date
 * @return {DateTime}
 */
function getDateTime(date) {
  switch (date) {
    case 'today':
      return DateTime.local().startOf('day');
    case 'tomorrow':
      return DateTime.local().startOf('day').plus({ days: 1 });
    default:
      return DateTime.fromFormat(date, dateFormat);
  }
}

/**
 * Get datetime string
 *
 * @param {string} date
 * @return {string}
 */
function getFormattedDateTime(today, date) {
  switch (date) {
    case 'today':
      return today;
    case 'tomorrow':
      return today
        ? DateTime.fromFormat(today, dateFormat).plus({ days: 1 }).toFormat(dateFormat)
        : null;
    default:
      return date;
  }
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

function changeReducer(state, action) {
  if (action.type !== 'change') {
    return state;
  }

  // If the startDate changes, move the endDate along to prevent an error.
  if (action.name === 'startDate') {
    let end = state.fields.endDate;
    const startDate = getDateTime(action.value);
    const endDate = getDateTime(state.fields.endDate);

    // Move endDate forward.
    if (startDate > endDate) {
      end = action.value;
    } else {
      const range = startDate.plus({ days: 7 });
      // move endDate backwards.
      if (range < endDate) {
        end = range.toFormat(dateFormat);
      }
    }

    return {
      ...state,
      fields: {
        ...state.fields,
        [action.name]: action.value,
        endDate: end,
      },
    };
  }

  return {
    ...state,
    fields: {
      ...state.fields,
      [action.name]: action.value,
    },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'change':
      return changeReducer(state, action);
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
    case 'today':
      return {
        ...state,
        today: action.value,
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

const propKeys = ['props', 'propsx'];

const locaitonFields = [
  'zipCode',
  'limit',
  'ticketing',
];

function Index() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const locationDisabled = state.fields.theater === 'include' && state.fields.theaters.length > 0;

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

  const startDate = useMemo(
    () => getFormattedDateTime(state.today, state.fields.startDate),
    [state.today, state.fields.startDate],
  );

  const endDate = useMemo(
    () => getFormattedDateTime(state.today, state.fields.endDate),
    [state.today, state.fields.endDate],
  );

  // Update the query.
  useReactor(value$ => (
    queryReactor(value$.pipe(
      // Map the array to an object.
      flatMap(([
        zipCode,
        limit,
        ticketing,
        theater,
        theaters,
        start,
        end,
      ]) => (of({
        zipCode,
        limit,
        ticketing,
        startDate: start,
        endDate: end,
        theaters: theater === 'include' ? theaters : [],
      }))),
    ))
  ), dispatch, [
    state.fields.zipCode,
    state.fields.limit,
    state.fields.ticketing,
    state.fields.theater,
    state.fields.theaters,
    startDate,
    endDate,
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
    state.fields.startTime,
    state.fields.endDate,
    state.fields.endTime,
    state.fields.theater,
    state.fields.theaters,
    state.fields.movie,
    state.fields.movies,
    state.fields.props,
    state.fields.propsx,
  ]);

  // Update "today" at midnight each day.
  useEffect(() => {
    const now = DateTime.local();
    const obs = timer(now.plus({ days: 1 }).startOf('day') - now, 24 * 60 * 60 * 1000);
    dispatch({ type: 'today', value: now.toFormat(dateFormat) });

    const sub = obs.subscribe(() => {
      dispatch({ type: 'today', value: DateTime.local().toFormat(dateFormat) });
    });

    return () => sub.unsubscribe();
  }, []);

  return (
    <Layout>
      <ReducerContext.Provider value={[state, dispatch]}>
        <Form locationDisabled={locationDisabled} startDate={startDate} />
        <Status status={state.status} error={state.error}>
          <Showtimes />
        </Status>
      </ReducerContext.Provider>
    </Layout>
  );
}

export default Index;
