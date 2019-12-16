import {
  of,
  merge,
  forkJoin,
  EMPTY,
} from 'rxjs';
import {
  switchMap,
  flatMap,
  distinctUntilChanged,
  catchError,
  map,
} from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';
import resultFilter from '../utils/result-filter';

function createQueryReactor(defaultQuery, wb) {
  return value$ => value$.pipe(
    distinctUntilChanged((z, y) => (
      z.zipCode === y.zipCode
      && z.limit === y.limit
      && z.ticketing === y.ticketing
      && z.startDate === y.startDate
      && z.endDate === y.endDate
      && z.theaters === y.theaters
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

      const url = new URL('https://cinematix.app/api/showtimes');

      if (q.theaters.length) {
        q.theaters.forEach(id => url.searchParams.append('theaters', id));
      } else if (q.zipCode.length === 5) {
        url.searchParams.set('zipCode', q.zipCode);

        ['limit', 'ticketing'].forEach((field) => {
          if (q[field] !== defaultQuery[field]) {
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
      url.searchParams.set('startDate', q.startDate);
      url.searchParams.set('endDate', q.endDate);

      return merge(
        updateRequested,
        of({
          type: 'status',
          status: 'fetching',
        }),
        ajax.getJSON(url.toString()).pipe(
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
          catchError(error => of({
            type: 'error',
            error,
          })),
        ),
      );
    }),
  );
}

export default createQueryReactor;
