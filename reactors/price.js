import {
  of,
  from,
  concat,
  race,
  defer,
} from 'rxjs';
import {
  flatMap,
  catchError,
  filter,
  first,
  bufferTime,
  map,
  withLatestFrom,
} from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';

const concurrency = 6;

function getUrl(id) {
  return `https://cinematix.app/api/offer/${id.split(':').pop()}/price`;
}

function handleResponse() {
  return source$ => source$.pipe(
    filter(r => !!r),
    flatMap(response => from(response.json()).pipe(
      flatMap((data) => {
        // Remove context.
        const { '@context': context, ...result } = data;

        if (!response.ok) {
          return of({
            type: 'prices',
            prices: [result],
          });
        }

        return of({
          type: 'prices',
          prices: [
            {
              '@type': 'DownloadAction',
              acitonStatus: 'CompletedActionStatus',
              object: result,
            },
          ],
        });
      }),
    )),
  );
}

function catchNetworkError(id) {
  return source$ => source$.pipe(
    catchError(() => of({
      type: 'prices',
      prices: [
        {
          '@type': 'DownloadAction',
          acitonStatus: 'FailedActionStatus',
          object: {
            '@id': id,
          },
        },
      ],
    })),
  );
}

function stopAction(id) {
  return of({
    type: 'prices',
    prices: [
      {
        '@type': 'DownloadAction',
        acitonStatus: 'PotentialActionStatus',
        object: {
          '@id': id,
        },
      },
    ],
  });
}

function shouldStop(id, { showtimes, price }) {
  if (price !== '1') {
    return true;
  }

  const showtime = showtimes.find(st => (st.offers && st.offers['@id'] === id));

  // If there is no longer a showtime, then don't make the request.
  if (!showtime) {
    return true;
  }

  // If there is no availability online.
  if (showtime.offers.availability !== 'InStock') {
    return true;
  }

  // If the showtime somehow has a price on it now, stop.
  if (showtime.offers.price) {
    return true;
  }

  return false;
}

function priceActionReducer(acc, action) {
  return {
    ...acc,
    prices: [
      ...acc.prices,
      ...action.prices,
    ],
  };
}

function priceReactor(value$) {
  return value$.pipe(
    // If price is not enabled, stop.
    filter(({ price }) => price === '1'),
    map(({ showtimes, prices }) => {
      // Remove showtimes that do not have an offer
      const filtered = showtimes.filter((showtime) => {
        if (!showtime.offers) {
          return false;
        }

        if (!showtime.offers['@id']) {
          return false;
        }

        // If there is no availability online.
        if (showtime.offers.availability !== 'InStock') {
          return false;
        }

        // If the showtime was returned with a price already on it.
        if (showtime.offers.price) {
          return false;
        }

        const existing = prices.find(({ object }) => (object['@id'] === showtime.offers['@id']));

        // If the price already exists in an active or completed state.
        if (existing && ['CompletedActionStatus', 'ActiveActionStatus'].includes(existing.acitonStatus)) {
          return false;
        }

        return true;
      });

      // Get a list of ids and remove any duplicates.
      const ids = [...(new Set(filtered.map(showtime => showtime.offers['@id'])))];

      return ids;
    }),
    filter(ids => ids.length !== 0),
    flatMap((ids) => {
      // Create action objects to track the status of the price.
      const actions = ids.map(id => ({
        '@type': 'DownloadAction',
        acitonStatus: 'ActiveActionStatus',
        object: {
          '@id': id,
        },
      }));

      return concat(
        of({
          type: 'prices',
          prices: actions,
        }),
        from(ids).pipe(
          flatMap(offerId => of(offerId).pipe(
            withLatestFrom(value$),
            flatMap(([id, current]) => {
              // Check the current state before firing a request.
              if (shouldStop(id, current)) {
                return stopAction(id);
              }

              return race(
                value$.pipe(
                  first(c => shouldStop(id, c)),
                  flatMap(() => stopAction(id)),
                ),
                defer(() => caches.match(getUrl(id))).pipe(
                  handleResponse(),
                ),
              );
            }),
          )),
          // Group by tick.
          bufferTime(0),
          filter(a => a.length > 0),
          map(a => a.reduce(priceActionReducer, {
            type: 'prices',
            prices: [],
          })),
        ),
        from(ids).pipe(
          flatMap(offerId => of(offerId).pipe(
            withLatestFrom(value$),
            flatMap(([id, current]) => {
              // Check the current state before firing a request.
              if (shouldStop(id, current)) {
                return stopAction(id);
              }

              return race(
                value$.pipe(
                  first(c => shouldStop(id, c)),
                  flatMap(() => stopAction(id)),
                ),
                fromFetch(getUrl(id)).pipe(
                  handleResponse(),
                  catchNetworkError(id),
                ),
              );
            }),
          ), undefined, concurrency),
          // Group by tick.
          bufferTime(0),
          filter(a => a.length > 0),
          map(a => a.reduce(priceActionReducer, {
            type: 'prices',
            prices: [],
          })),
        ),
      );
    }),
  );
}

export default priceReactor;
