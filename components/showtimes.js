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

function Showtimes({
  options,
  startTime,
  endTime,
}) {
  const [state] = useContext(reducer);

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

  const timeFormater = useCallback((showtimeStartDate) => {
    const today = getTodayDateTime(state.today);
    const showStart = DateTime.fromISO(showtimeStartDate);
    const longFormat = {
      month: 'long',
      weekday: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    };

    const timeFormat = showStart > today.endOf('day') ? longFormat : DateTime.TIME_SIMPLE;

    return showStart.toLocaleString(timeFormat);
  }, [state.today]);

  const {
    movie: movieWidth,
    theater: theaterWidth,
    showtime: showtimeWidth,
    limit: optionsLimit,
  } = useMemo(() => {
    let movie = 4;
    let theater = 4;
    let showtime = 4;
    const limit = options.length > 6 ? 6 : options.length;
    switch (limit) {
      case 2:
        showtime -= 1;
        movie -= 1;
        break;
      case 3:
        showtime -= 1;
        movie -= 1;
        theater -= 1;
        break;
      case 4:
        showtime -= 2;
        movie -= 1;
        theater -= 1;
        break;
      case 5:
        showtime -= 2;
        movie -= 2;
        theater -= 1;
        break;
      case 6:
        showtime -= 2;
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
      limit,
    };
  }, [options]);

  const rows = useMemo(() => [...(state.showtimes || [])].filter(({
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
        // Use the duration of the movie to determine the end, assume 20 minutes of previews.
        const showEnd = showStart.plus(
          Duration.fromISO(workPresented.duration),
        ).plus({ minutes: 20 });
        const showSet = {
          year: showStart.get('year'),
          month: showStart.get('month'),
          day: showStart.get('day'),
        };
        const realEnd = startTime && endTime < startTime
          ? endTime.set(showSet).plus({ days: 1 })
          : endTime.set(showSet);

        if (showEnd > realEnd) {
          return false;
        }
      }
    }

    return true;
  }).sort((a, b) => (
    // @TODO make the sort configurable.
    DateTime.fromISO(a.startDate) - DateTime.fromISO(b.startDate)
  )).map((showtime) => {
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
              <img src="static/baseline-check_circle-24px.svg" alt={option.label} /><span className="d-md-none"> {option.label}</span>
            </div>
          );
        }

        return (
          <div key={option.value} className="col-md-1 text-left text-md-center">
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

    return (
      <div key={showtime['@id']} className="row align-items-center mb-2 mb-md-0">
        <div className={`col-md-${movieWidth} mb-2`}>
          {movieDisplay}
        </div>
        <div className={`col-md-${theaterWidth} mb-2`}>
          {theaterDisplay}
        </div>
        {optionsDisplay}
        <div className={`col-md-${showtimeWidth} mb-2`}>
          <a className={className.join(' ')} href={showtime.offers.url}>
            <time dateTime={showtime.startDate}>
              {timeFormater(showtime.startDate)}
            </time>
          </a>
        </div>
      </div>
    );
  }), [
    state.showtimes,
    options,
    optionsFilter,
    movieFilter,
    displayFilter,
    timeFormater,
    startTime,
    endTime,
  ]);

  if (rows.length === 0) {
    return null;
  }

  let optionsDisplay;
  if (optionsLimit > 1) {
    optionsDisplay = options.slice(0, optionsLimit).map(option => (
      <div key={option.value} className="col-md-1 mb-2 text-center text-break">
        {option.label}
      </div>
    ));
  }

  return (
    <Fragment>
      <div className="row border-bottom d-none mb-2 d-md-flex align-items-end">
        <h5 className={`col-md-${movieWidth}`}>
          Movie
        </h5>
        <h5 className={`col-md-${theaterWidth}`}>
          Theater
        </h5>
        {optionsDisplay}
      </div>
      {rows}
    </Fragment>
  );
}

export default Showtimes;
