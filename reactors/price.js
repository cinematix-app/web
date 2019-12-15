import {
  of,
  from,
  merge,
  EMPTY,
} from 'rxjs';
import {
  flatMap,
  map,
  catchError,
} from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

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

      return merge(
        of({
          type: 'prices',
          prices: actions,
        }),
        from(ids).pipe(
          flatMap((id) => {
            const url = new URL(`https://cinematix.app/api/offer/${id.split(':').pop()}/price`);

            return ajax.getJSON(url.toString()).pipe(
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
              catchError(error => of({
                action: 'prices',
                prices: [
                  {
                    '@type': 'DownloadAction',
                    acitonStatus: 'FailedActionStatus',
                    object: {
                      '@id': id,
                    },
                    error,
                  },
                ],
              })),
            );
          }),
        ),
      );
    }),
  );
}

export default priceReactor;
