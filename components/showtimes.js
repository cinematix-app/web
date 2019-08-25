import {
  Fragment,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import { DateTime, Duration } from 'luxon';
import reducer from '../context/reducer';
import displayFilter from '../utils/display-filter';
import displayFilterExclusive from '../utils/display-filter-exclusive';
import getTodayDateTime from '../utils/today-datetime';
import getPropValue from '../utils/prop-value';
import getPropOptions from '../utils/prop-options';

function Showtimes() {
  const [state] = useContext(reducer);

  const options = useMemo(() => (
    getPropValue(getPropOptions(state.props, state.fields.props), state.fields.props)
  ), [state.props, state.fields.props]);

  const startTime = useMemo(() => (
    state.fields.startTime ? DateTime.fromISO(state.fields.startTime) : null
  ), [state.fields.startTime]);
  const endTime = useMemo(() => (
    state.fields.endTime ? DateTime.fromISO(state.fields.endTime) : null
  ), [state.fields.endTime]);

  const optionsFilter = useCallback(props => displayFilter(
    state.fields.props,
    state.fields.propsx,
    props,
  ), [state.fields.props, state.fields.propsx]);

  const movieFilter = useCallback(workPresented => displayFilterExclusive(
    state.fields.movies,
    state.fields.movie,
    workPresented,
  ), [state.fields.movies, state.fields.movies]);

  const theaterFilter = useCallback(location => displayFilterExclusive(
    state.fields.theaters,
    state.fields.theater,
    location,
  ), [state.fields.theater, state.fields.theaters]);

  const showtimes = useMemo(() => [...(state.showtimes || [])].filter(({
    location,
    offers,
    workPresented,
    props,
    startDate: showtimeStartDate,
  }) => {
    if (offers.availability === 'https://schema.org/Discontinued') {
      return false;
    }

    if (!movieFilter(workPresented)) {
      return false;
    }

    if (!theaterFilter(location)) {
      return false;
    }

    if (!optionsFilter(props)) {
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
          const showEnd = showStart.plus(duration).plus({ minutes: 20 })
          const realEnd = startTime && endTime < startTime
            ? endTime.set(showSet).plus({ days: 1 })
            : endTime.set(showSet);

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
  )), [
    state.showtimes,
    optionsFilter,
    movieFilter,
    displayFilter,
    startTime,
    endTime,
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

  const {
    movie: movieWidth,
    theater: theaterWidth,
    showtime: showtimeWidth,
    showtimeDetail: showtimeDeatailWidth,
    limit: optionsLimit,
  } = useMemo(() => {
    let movie = hasFutureShowtimes ? 3 : 4;
    let theater = 4;
    const showtime = hasFutureShowtimes ? 5 : 4;
    const allowed = hasFutureShowtimes ? 3 : 4;
    const limit = options.length > allowed ? allowed : options.length;
    switch (limit) {
      case 2:
        movie -= 1;
        theater -= 1;
        break;
      case 3:
        movie -= 1;
        theater -= 2;
        break;
      case 4:
        movie -= 2;
        theater -= 2;
        break;
      default:
        break;
    }

    return {
      movie,
      theater,
      showtime,
      showtimeDetail: hasFutureShowtimes ? 3 : 4,
      limit,
    };
  }, [
    options,
    hasFutureShowtimes,
  ]);

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

      let optionsDisplay;
      if (optionsLimit > 1) {
        optionsDisplay = options.slice(0, optionsLimit).map((option) => {
          let checkMark;

          if (showtime.props.find(obj => obj['@id'] === option.value)) {
            checkMark = (
              <div className="mb-2">
                <img src="static/baseline-check_circle-24px.svg" alt={option.label} /><span className="d-lg-none"> {option.label}</span>
              </div>
            );
          }

          return (
            <div key={option.value} className="col-lg-1 text-left text-lg-center">
              {checkMark}
            </div>
          );
        });
      }

      let className = [
        'btn',
        'btn-block',
      ];
      if (showtime.offers.availability === 'https://schema.org/InStock') {
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
        ? showStart.plus(duration).plus({ minutes: 20 })
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
          {optionsDisplay}
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
    options,
    optionsLimit,
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

  let optionsDisplay;
  if (optionsLimit > 1) {
    optionsDisplay = options.slice(0, optionsLimit).map(option => (
      <div key={option.value} className="col-lg-1 mb-2 text-center text-break">
        {option.label}
      </div>
    ));
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
        {optionsDisplay}
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
