import {
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/router';

function useQueryReducer(reducer, defaultQuery) {
  const router = useRouter();
  const { pathname, query, replace } = router;

  const mergedQuery = useMemo(() => {
    const params = Object.keys(query).reduce((acc, name) => {
      if (Array.isArray(defaultQuery[name])) {
        acc[name] = Array.isArray(query[name]) ? query[name] : [query[name]];
      } else {
        acc[name] = query[name];
      }

      return acc;
    }, {});
    return {
      ...defaultQuery,
      ...params,
    };
  }, [
    defaultQuery,
    query,
  ]);

  const dispatch = useCallback((action) => {
    const nextQuery = reducer(mergedQuery, action);

    // Only put params in the URL if they differ from the default.
    const params = Object.keys(nextQuery).reduce((acc, name) => {
      if (nextQuery[name] !== defaultQuery[name] && nextQuery[name] !== '') {
        if (Array.isArray(defaultQuery[name])) {
          acc[name] = Array.isArray(nextQuery[name]) ? nextQuery[name] : [nextQuery[name]];
        } else {
          acc[name] = nextQuery[name];
        }
      }

      return acc;
    }, {});

    replace({
      pathname,
      query: params,
    });
  }, [
    reducer,
    replace,
    pathname,
    mergedQuery,
  ]);

  return [mergedQuery, dispatch];
}

export default useQueryReducer;
