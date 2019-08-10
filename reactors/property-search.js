import {
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

function createPropertySearchReactor(type, id) {
  return value$ => value$.pipe(
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

export default createPropertySearchReactor;
