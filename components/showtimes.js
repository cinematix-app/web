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

  const {
    movie: movieWidth,
    theater: theaterWidth,
    showtime: showtimeWidth,
    limit: optionsLimit,
  } = useMemo(() => {
    let movie = 3;
    let theater = 4;
    const showtime = 5;
    const limit = options.length > 2 ? 2 : options.length;
    switch (limit) {
      case 2:
        movie -= 1;
        theater -= 1;
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

    const showEnd = showStart.plus(
      Duration.fromISO(showtime.workPresented.duration),
    ).plus({ minutes: 20 });

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
          <div className="row">
            <div className="col-sm-3 col-4 mb-2">
              <time dateTime={showtime.startDate}>
                {showStart.toLocaleString(DateTime.DATE_SHORT)}
              </time>
            </div>
            <div className="col-sm-3 col-4 mb-2">
              <time dateTime={showtime.startDate}>
                {showStart.toLocaleString(DateTime.TIME_SIMPLE)}
              </time>
            </div>
            <div className="col-sm-3 col-4 mb-2">
              <time dateTime={showEnd.toISO()}>
                {showEnd.toLocaleString(DateTime.TIME_SIMPLE)}
              </time>
            </div>
            <div className="col-sm-3 col-12">
              <a className={className.join(' ')} href={showtime.offers.url}>
                  →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }), [
    state.showtimes,
    options,
    optionsFilter,
    movieFilter,
    displayFilter,
    startTime,
    endTime,
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
        <div className={`col-lg-${showtimeWidth} mb-2`}>
          <div className="row align-items-end">
            <h5 className="col-3 mb-0">
              Date
            </h5>
            <h5 className="col-3 mb-0">
              Start
            </h5>
            <h5 className="col-3 mb-0">
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
