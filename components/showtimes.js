import {
  Fragment,
  useContext,
  useMemo,
} from 'react';
import {
  of,
} from 'rxjs';
import {
  filter,
  flatMap,
} from 'rxjs/operators';
import { DateTime, Duration } from 'luxon';
import useReactor from '@cinematix/reactor';
import reducer from '../context/reducer';
import getTodayDateTime from '../utils/today-datetime';
import useDisplayFilter from '../hooks/display-filter';
import useDisplayFilterExclusive from '../hooks/display-filter-exclusive';
import queryReducer from '../context/query-reducer';
import priceReactor from '../reactors/price';
import Showtime from './showtime';
import { previews } from '../utils/config';

function Showtimes() {
  const [state, dispatch] = useContext(reducer);
  const [queryState] = useContext(queryReducer);

  const startTime = useMemo(() => (
    queryState.startTime ? DateTime.fromISO(queryState.startTime) : null
  ), [queryState.startTime]);
  const endTime = useMemo(() => (
    queryState.endTime ? DateTime.fromISO(queryState.endTime) : null
  ), [queryState.endTime]);

  const movieFilter = useDisplayFilterExclusive(queryState.movies, queryState.movie);
  const theaterFilter = useDisplayFilter(queryState.theaters, queryState.theatersx);
  const genreFilter = useDisplayFilter(queryState.genres, queryState.genresx);
  const amenityFilter = useDisplayFilter(queryState.amenities, queryState.amenitiesx);
  const ratingFilter = useDisplayFilterExclusive(queryState.ratings, queryState.rating);
  const formatFilter = useDisplayFilterExclusive(queryState.formats, queryState.format);
  const propFilter = useDisplayFilter(queryState.props, queryState.propsx);

  // Calculate the last end time, regardless of the day the show starts on.
  const endOfDay = useMemo(() => {
    if (!state.showtimes || state.showtimes.length === 0) {
      return null;
    }

    // Showtimes sorted by enddatetime.
    const showtimes = [...state.showtimes].sort((a, b) => {
      const aStart = DateTime.fromISO(a.startDate);

      const aStartSet = {
        year: aStart.get('year'),
        month: aStart.get('month'),
        day: aStart.get('day'),
      };

      // Set both a and b to the same year, month, and day, so we can make a proper comparison.
      const bStart = DateTime.fromISO(b.startDate).set(aStartSet);

      const aDuration = Duration.fromISO(a.workPresented.duration);
      const bDuration = Duration.fromISO(b.workPresented.duration);

      return aStart.plus(aDuration) - bStart.plus(bDuration);
    });

    const last = [...showtimes].pop();

    const lastStart = DateTime.fromISO(last.startDate);
    const duration = Duration.fromISO(last.workPresented.duration);
    const lastEnd = lastStart.plus(duration).plus({ minutes: previews });

    // If the last start and end day are on the same day, then set the end to midnight.
    if (lastStart.hasSame(lastEnd, 'day')) {
      return lastEnd.plus({ days: 1 }).startOf('day').toISO();
    }

    return lastEnd.toISO();
  }, [
    state.showtimes,
  ]);

  const showtimes = useMemo(() => {
    const endofDayDateTime = endOfDay ? DateTime.fromISO(endOfDay) : null;

    return [...(state.showtimes || [])].filter(({
      location,
      offers,
      workPresented,
      additionalProperty,
      videoFormat,
      startDate: showtimeStartDate,
    }) => {
      if (offers.availability === 'Discontinued') {
        return false;
      }

      if (!movieFilter(workPresented)) {
        return false;
      }

      if (!theaterFilter(location)) {
        return false;
      }

      if (!genreFilter(workPresented.genre)) {
        return false;
      }

      if (!amenityFilter(location.amenityFeature)) {
        return false;
      }

      if (!ratingFilter(workPresented.contentRating)) {
        return false;
      }

      if (!formatFilter(videoFormat)) {
        return false;
      }

      if (!propFilter(additionalProperty)) {
        return false;
      }

      if (startTime || endTime) {
        const showStart = DateTime.fromISO(showtimeStartDate);

        if (startTime) {
          const showSet = {
            year: showStart.get('year'),
            month: showStart.get('month'),
            day: showStart.get('day'),
          };

          // Ensure that the show starts after the start time, even if it's on a different day.
          if (showStart < startTime.set(showSet)) {
            return false;
          }
        }

        if (endTime) {
          const duration = Duration.fromISO(workPresented.duration);

          const showSet = {
            year: showStart.get('year'),
            month: showStart.get('month'),
            day: showStart.get('day'),
          };

          if (duration.get('minutes') > 0) {
            // Use the duration of the movie to determine the end, assume 20 minutes of previews.
            const showEnd = showStart.plus(duration).plus({ minutes: previews });

            // if it's after the end of day, move forward by 1 day.
            const realEnd = endofDayDateTime.set(showSet) < endTime.set(showSet)
              ? endTime.set(showSet)
              : endTime.set(showSet).plus({ days: 1 });

            if (showEnd > realEnd) {
              return false;
            }
          } else if (showStart > endTime.set(showSet)) {
          // Ensure that the show does not start after the end time if the real end time is
          // unkown.
            return false;
          }
        }
      }

      return true;
    }).sort((a, b) => (
    // @TODO make the sort configurable.
      DateTime.fromISO(a.startDate) - DateTime.fromISO(b.startDate)
    ));
  }, [
    state.showtimes,
    genreFilter,
    amenityFilter,
    ratingFilter,
    formatFilter,
    movieFilter,
    propFilter,
    theaterFilter,
    startTime,
    endTime,
    endOfDay,
  ]);

  useReactor(value$ => (
    priceReactor(value$.pipe(
      // If price is disabled, stop.
      filter(([price]) => price === '1'),
      // Convert to Objects
      flatMap(([price, times, prices]) => of({
        price,
        showtimes: times,
        prices,
      })),
    ))
  ), dispatch, [
    queryState.price,
    showtimes,
    state.prices,
  ]);

  const hasFutureShowtimes = useMemo(() => {
    const today = getTodayDateTime(state.today);
    if (!today) {
      return false;
    }

    // if there are any showtimes that are not today, then they are in the future.
    return !!showtimes.find(({ startDate }) => !DateTime.fromISO(startDate).startOf('day').equals(today));
  }, [
    showtimes,
    state.today,
  ]);

  const movieWidth = hasFutureShowtimes ? 3 : 4;
  const theaterWidth = 4;
  const showtimeWidth = hasFutureShowtimes ? 5 : 4;
  const showtimeDeatailWidth = hasFutureShowtimes ? 3 : 4;

  const rows = useMemo(() => (
    showtimes.map((showtime) => {
      const price = queryState.price !== '1' ? undefined : state.prices.find(action => action.object['@id'] === showtime.offers['@id']);

      return (
        <Showtime
          key={showtime['@id']}
          showtime={showtime}
          price={price}
          today={state.today}
          width={showtimeWidth}
          theaterWidth={theaterWidth}
          movieWidth={movieWidth}
          detailWidth={showtimeDeatailWidth}
          hasFutureShowtimes={hasFutureShowtimes}
        />
      );
    })
  ), [
    state.today,
    showtimes,
    queryState.price,
    state.prices,
    movieWidth,
    theaterWidth,
    showtimeWidth,
    showtimeDeatailWidth,
    hasFutureShowtimes,
  ]);

  const dateHeader = useMemo(() => {
    if (!hasFutureShowtimes) {
      return null;
    }

    return (
      <h5 className={`col-${showtimeDeatailWidth} mb-0`}>
        Date
      </h5>
    );
  }, [
    hasFutureShowtimes,
    showtimeDeatailWidth,
  ]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <Fragment>
      <div className="row border-bottom d-none mb-2 d-lg-flex align-items-end">
        <h5 className={`col-lg-${movieWidth} mb-0`}>
          Movie
        </h5>
        <h5 className={`col-lg-${theaterWidth} mb-0`}>
          Theater
        </h5>
        <div className={`col-lg-${showtimeWidth}`}>
          <div className="row align-items-end">
            {dateHeader}
            <h5 className={`col-${showtimeDeatailWidth} mb-0`}>
              Start
            </h5>
            <h5 className={`col-${showtimeDeatailWidth} mb-0`}>
              End <small><small><abbr title={`assumes ${previews} minutes of previews`}>approx</abbr></small></small>
            </h5>
          </div>
        </div>
      </div>
      {rows}
    </Fragment>
  );
}

export default Showtimes;
