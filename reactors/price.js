import {
  of,
  from,
  EMPTY,
  concat,
  defer,
} from 'rxjs';
import {
  flatMap,
  map,
  catchError,
  filter,
} from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';

const concurrency = 10;

function priceReactor(value$) {
  return value$.pipe(
    flatMap(({ showtimes, prices }) => {
      // Remove showtimes that do not have an offer
      const filtered = showtimes.filter((showtime) => {
        if (!showtime.offers) {
          return false;
        }

        if (!showtime.offers['@id']) {
          return false;
        }

        if (showtime.offers.availability !== 'InStock') {
          return false;
        }

        // If the price already exists, then those should be excluded.
        return !prices.find(({ object }) => (object['@id'] === showtime.offers['@id']));
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
          flatMap((id) => {
            const url = new URL(`https://cinematix.app/api/offer/${id.split(':').pop()}/price`);

            return concat(
              defer(() => caches.match(url.toString())),
              fromFetch(url.toString()),
            ).pipe(
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
              catchError(({ response }) => {
                // Remove context.
                const { '@context': context, ...result } = response;

                return of({
                  type: 'prices',
                  prices: [result],
                });
              }),
            );
          }, undefined, concurrency),
        ),
      );
    }),
  );
}

export default priceReactor;
