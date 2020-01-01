import {
  of,
  concat,
  forkJoin,
  EMPTY,
  from,
  defer,
} from 'rxjs';
import {
  switchMap,
  flatMap,
  distinctUntilChanged,
  catchError,
  map,
  filter,
  reduce,
} from 'rxjs/operators';
import { DateTime } from 'luxon';
import { fromFetch } from 'rxjs/fetch';
import resultFilter from '../utils/result-filter';
import dateFormat from '../utils/date-format';
import mergeList from '../utils/merge-list';

const concurrency = 6;

function handleResponse() {
  return source$ => source$.pipe(
    filter(r => !!r),
    flatMap((response) => {
      // Throw a network error on a bad HTTP response.
      if (!response.ok) {
        const error = new Error(response.statusText);
        error.response = response;
        throw error;
      }

      return response.json();
    }),
    flatMap(data => (
      forkJoin([
        resultFilter(data, 'ScreeningEvent'),
        resultFilter(data, 'MovieTheater'),
        resultFilter(data, 'x:Amenity'),
        resultFilter(data, 'Movie'),
        resultFilter(data, 'x:Genre'),
        resultFilter(data, 'x:Rating'),
        resultFilter(data, 'x:Format'),
        resultFilter(data, 'x:Property'),
      ]).pipe(
        map(([showtimes, theaters, amenities, movies, genres, ratings, formats, props]) => ({
          type: 'result',
          showtimes,
          theaters,
          amenities,
          movies,
          genres,
          ratings,
          formats,
          props,
        })),
      )
    )),
    // Combine all the actions into a single response.
    reduce((acc, action) => ({
      ...acc,
      showtimes: mergeList(acc.showtimes, action.showtimes),
      theaters: mergeList(acc.theaters, action.theaters),
      amenities: mergeList(acc.amenities, action.amenities),
      movies: mergeList(acc.movies, action.movies),
      genres: mergeList(acc.genres, action.genres),
      ratings: mergeList(acc.ratings, action.ratings),
      formats: mergeList(acc.formats, action.formats),
      props: mergeList(acc.props, action.props),
    }), {
      type: 'result',
      showtimes: [],
      theaters: [],
      amenities: [],
      movies: [],
      genres: [],
      ratings: [],
      formats: [],
      props: [],
    }),
  );
}

function catchNetworkError() {
  return source$ => source$.pipe(
    catchError(error => of({
      type: 'error',
      error,
    })),
  );
}

function createQueryReactor(defaultQuery, wb) {
  return value$ => value$.pipe(
    distinctUntilChanged((z, y) => (
      z.zipCode === y.zipCode
      && z.limit === y.limit
      && z.ticketing === y.ticketing
      && z.startDate === y.startDate
      && z.endDate === y.endDate
      && z.theaters.sort().toString() === y.theaters.sort().toString()
    )),
    switchMap((q) => {
      if (q.theaters.length === 0 && q.zipCode.length < 5) {
        return of({
          type: 'result',
        });
      }

      // If we are about to make a network request, and the app needs to be updated,
      // reload the page instead. Prevent an infinite loop by updating the state.
      let updateRequested = EMPTY;
      if (q.needsUpdate) {
        wb.messageSW({ type: 'SKIP_WAITING' });
        updateRequested = of({
          type: 'updateRequested',
        });
      }

      const start = DateTime.fromFormat(q.startDate, dateFormat);
      const end = DateTime.fromFormat(q.endDate, dateFormat);

      const days = end.diff(start, 'days').get('day');

      const urls = new Set();

      for (let i = 0; i <= days; i += 1) {
        const formattedDate = start.plus({ days: i }).toFormat(dateFormat);
        if (q.theaters.length) {
          q.theaters.forEach((id) => {
            urls.add(`https://cinematix.app/api/theater/${id}/showtimes/${formattedDate}`);
          });
        } else {
          const url = new URL(`https://cinematix.app/api/geo/US-${q.zipCode}/showtimes/${formattedDate}`);

          ['limit', 'ticketing'].forEach((field) => {
            if (q[field] !== defaultQuery[field]) {
              url.searchParams.set(field, q[field]);
            }
          });

          urls.add(url.toString());
        }
      }

      return concat(
        updateRequested,
        of({
          type: 'status',
          status: 'fetching',
        }),
        // If any of the urls are in the cache, get those first.
        from([...urls.values()]).pipe(
          flatMap(url => defer(() => caches.match(url))),
          handleResponse(),
          // Do not remove the fetching status if there are no showtimes to return.
          filter(action => !!action.showtimes.length),
        ),
        // Go to the network to refresh to result.
        from([...urls.values()]).pipe(
          flatMap(url => fromFetch(url), undefined, concurrency),
          handleResponse(),
          catchNetworkError(),
        ),
      );
    }),
  );
}

export default createQueryReactor;
