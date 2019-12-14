import {
  useReducer,
  useEffect,
  useMemo,
} from 'react';
import { of, timer } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { DateTime } from 'luxon';
import useReactor from '@cinematix/reactor';
import ReducerContext from '../context/reducer';
import QueryReducerContext from '../context/query-reducer';
import Layout from '../components/layout';
import Status from '../components/status';
import Showtimes from '../components/showtimes';
import Form from '../components/form';
import dateFormat from '../utils/date-format';
import createQueryReactor from '../reactors/query';
import getFormattedDateTime from '../utils/formatted-datetime';
import useQueryReducer from '../hooks/query-reducer';

const defaultQuery = {
  zipCode: '',
  limit: '5',
  ticketing: 'any',
  startDate: 'today',
  startTime: '',
  endDate: 'today',
  endTime: '',
  theaters: [],
  theatersx: [],
  amenities: [],
  amenitiesx: [],
  movie: 'include',
  movies: [],
  rating: 'include',
  ratings: [],
  genres: [],
  genresx: [],
  format: 'include',
  formats: [],
  props: [],
  propsx: [],
};

const initialState = {
  today: null,
  showtimes: [],
  theaters: [],
  amenities: [],
  movies: [],
  genres: [],
  ratings: [],
  formats: [],
  props: [],
  status: 'waiting',
  error: null,
};

const queryReactor = createQueryReactor(defaultQuery);

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

function resultReducer(state, action) {
  if (action.type !== 'result') {
    return state;
  }

  return {
    ...state,
    status: 'ready',
    showtimes: action.showtimes || [],
    theaters: mergeList(state.theaters, action.theaters || []),
    amenities: mergeList(state.amenities, action.amenities || []),
    movies: mergeList(state.movies, action.movies || []),
    genres: mergeList(state.genres, action.genres || []),
    ratings: mergeList(state.ratings, action.ratings || []),
    formats: mergeList(state.formats, action.formats || []),
    props: mergeList(state.props, action.props || []),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'result':
      return resultReducer(state, action);
    case 'status':
      if (state.status === action.status) {
        return state;
      }

      return {
        ...state,
        status: action.status,
      };
    case 'error':
      if (state.status === 'error') {
        return state;
      }

      return {
        ...state,
        status: 'error',
        error: action.error,
      };
    case 'today':
      if (state.today === action.value) {
        return state;
      }

      return {
        ...state,
        today: action.value,
      };
    default:
      throw new Error();
  }
}

function queryChangeReducer(state, action) {
  if (action.type !== 'change') {
    return state;
  }

  // If the startDate changes, move the endDate along to prevent an error.
  if (action.name === 'startDate') {
    let end = state.endDate;
    const startDate = getDateTime(action.value);
    const endDate = getDateTime(state.endDate);

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
      [action.name]: action.value,
      endDate: end,
    };
  }

  return {
    ...state,
    [action.name]: action.value,
  };
}

function queryReducer(state, action) {
  switch (action.type) {
    case 'change':
      return queryChangeReducer(state, action);
    default:
      throw new Error('Invalid Action');
  }
}

function Index() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [queryState, queryDispatch] = useQueryReducer(queryReducer, defaultQuery);

  const startDate = useMemo(
    () => getFormattedDateTime(state.today, queryState.startDate),
    [state.today, queryState.startDate],
  );

  const endDate = useMemo(
    () => getFormattedDateTime(state.today, queryState.endDate),
    [state.today, queryState.endDate],
  );

  // Update the query.
  useReactor(value$ => (
    queryReactor(value$.pipe(
      // Map the array to an object.
      flatMap(([
        zipCode,
        limit,
        ticketing,
        theaters,
        start,
        end,
      ]) => (of({
        zipCode,
        limit,
        ticketing,
        startDate: start,
        endDate: end,
        theaters,
      }))),
    ))
  ), dispatch, [
    queryState.zipCode,
    queryState.limit,
    queryState.ticketing,
    queryState.theaters,
    startDate,
    endDate,
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
      <QueryReducerContext.Provider value={[queryState, queryDispatch]}>
        <ReducerContext.Provider value={[state, dispatch]}>
          <Form />
          <Status isEmpty={state.showtimes.length === 0} status={state.status} error={state.error}>
            <Showtimes />
          </Status>
        </ReducerContext.Provider>
      </QueryReducerContext.Provider>
    </Layout>
  );
}

export default Index;
