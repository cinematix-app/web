import {
  Fragment,
  useContext,
  useMemo,
} from 'react';
import { DateTime, Duration } from 'luxon';
import reducer from '../context/reducer';
import getTodayDateTime from '../utils/today-datetime';
import useDisplayFilter from '../hooks/display-filter';
import useDisplayFilterExclusive from '../hooks/display-filter-exclusive';

const previews = 20;

function Showtimes() {
  const [state] = useContext(reducer);

  const startTime = useMemo(() => (
    state.fields.startTime ? DateTime.fromISO(state.fields.startTime) : null
  ), [state.fields.startTime]);
  const endTime = useMemo(() => (
    state.fields.endTime ? DateTime.fromISO(state.fields.endTime) : null
  ), [state.fields.endTime]);

  const movieFilter = useDisplayFilterExclusive(state.fields.movies, state.fields.movie);
  const theaterFilter = useDisplayFilter(state.fields.theaters, state.fields.theatersx);
  const genreFilter = useDisplayFilter(state.fields.genres, state.fields.genresx);
  const amenityFilter = useDisplayFilter(state.fields.amenities, state.fields.amenitiesx);
  const ratingFilter = useDisplayFilterExclusive(state.fields.ratings, state.fields.rating);
  const formatFilter = useDisplayFilterExclusive(state.fields.formats, state.fields.format);
  const propFilter = useDisplayFilter(state.fields.props, state.fields.propsx);

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

  const rows = useMemo(() => {
    const today = getTodayDateTime(state.today);

    return showtimes.map((showtime) => {
      let movieDisplay;
      if (showtime.workPresented) {
        movieDisplay = (
          <a href={showtime.workPresented.url}>
            {showtime.workPresented.name}
          </a>
        );
      }

      let theaterDisplay;
      if (showtime.location) {
        theaterDisplay = (
          <a href={showtime.location.url}>
            {showtime.location.name}
          </a>
        );
      }

      let className = [
        'btn',
        'btn-block',
      ];
      if (showtime.offers.availability === 'InStock') {
        className = [
          ...className,
          'btn-outline-primary',
        ];
      } else {
        className = [
          ...className,
          'btn-outline-secondary',
          'disabled',
        ];
      }

      const showStart = DateTime.fromISO(showtime.startDate);

      const duration = Duration.fromISO(showtime.workPresented.duration);
      const showEnd = duration.get('minutes') > 0
        ? showStart.plus(duration).plus({ minutes: previews })
        : null;

      let dateDisplay;
      if (hasFutureShowtimes) {
        dateDisplay = (
          <div className={`col-sm-${showtimeDeatailWidth} col-4 mb-2`}>
            <time dateTime={showtime.startDate}>
              {!today || !showStart.startOf('day').equals(today) ? showStart.toLocaleString(DateTime.DATE_SHORT) : null}
            </time>
          </div>
        );
      }

      return (
        <div key={showtime['@id']} className="row align-items-center mb-2 mb-lg-0">
          <div className={`col-lg-${movieWidth} mb-2`}>
            {movieDisplay}
          </div>
          <div className={`col-lg-${theaterWidth} mb-2`}>
            {theaterDisplay}
          </div>
          <div className={`col-lg-${showtimeWidth} mb-2`}>
            <div className="row align-items-center">
              {dateDisplay}
              <div className={`col-sm-${showtimeDeatailWidth} col-4 mb-2`}>
                <time dateTime={showtime.startDate}>
                  {showStart.toLocaleString(DateTime.TIME_SIMPLE)}
                </time>
              </div>
              <div className={`col-sm-${showtimeDeatailWidth} col-4 mb-2`}>
                <time dateTime={showEnd ? showEnd.toISO() : undefined}>
                  {showEnd ? showEnd.toLocaleString(DateTime.TIME_SIMPLE) : undefined}
                </time>
              </div>
              <div className={`col-sm-${showtimeDeatailWidth} col-12`}>
                <a className={className.join(' ')} href={showtime.offers.url}>
                  →
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    });
  }, [
    state.today,
    showtimes,
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
              End <small><small><abbr title="assumes 20 minutes of previews">approx</abbr></small></small>
            </h5>
          </div>
        </div>
      </div>
      {rows}
    </Fragment>
  );
}

export default Showtimes;
