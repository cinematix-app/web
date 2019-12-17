import {
  of,
  from,
  EMPTY,
  concat,
} from 'rxjs';
import {
  flatMap,
  map,
  catchError,
  filter,
  reduce,
} from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';

const concurrency = 6;

function getUrl(id) {
  return `https://cinematix.app/api/offer/${id.split(':').pop()}/price`;
}

function handleResponse() {
  return source$ => source$.pipe(
    filter(r => !!r),
    flatMap(r => r.json()),
    map((data) => {
      // Remove context.
      const { '@context': context, ...result } = data;

      return {
        type: 'prices',
        prices: [
          {
            '@type': 'DownloadAction',
            acitonStatus: 'CompletedActionStatus',
            object: result,
          },
        ],
      };
    }),
    // @TODO fetch/cache doesn't throw an error, it sets response.ok to false. We should do the same.
    catchError(({ response }) => {
      // Remove context.
      const { '@context': context, ...result } = response;

      return of({
        type: 'prices',
        prices: [result],
      });
    }),
  );
}

function priceReactor(value$) {
  return value$.pipe(
    // If price is not enabled, stop.
    filter(({ price }) => price === '1'),
    flatMap(({ showtimes, prices }) => {
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

        // If the price already exists in a non-failed state.
        if (existing && existing.acitonStatus !== 'FailedActionStatus') {
          return false;
        }

        return true;
      });

      // Get a list of ids and remove any duplicates.
      const ids = [...(new Set(filtered.map(showtime => showtime.offers['@id'])))];

      // If there are no ids to process, we can fail now.
      if (ids.length === 0) {
        return EMPTY;
      }

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
          flatMap(id => caches.match(getUrl(id))),
          handleResponse(),
          // Reduce to a single action.
          reduce((acc, action) => ({
            ...acc,
            prices: [
              ...acc.prices,
              ...action.prices,
            ],
          }), {
            type: 'prices',
            prices: [],
          }),
        ),
        from(ids).pipe(
          flatMap(id => fromFetch(getUrl(id)), undefined, concurrency),
          handleResponse(),
        ),
      );
    }),
  );
}

export default priceReactor;
