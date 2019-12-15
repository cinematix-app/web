import { DateTime, Duration } from 'luxon';
import { previews } from '../utils/config';
import Spinner from './spinner';
import getTodayDateTime from '../utils/today-datetime';

function Showtime({
  showtime,
  price,
  today,
  width,
  movieWidth,
  theaterWidth,
  detailWidth,
  hasFutureShowtimes,
}) {
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
    const todayDateTime = getTodayDateTime(today);
    dateDisplay = (
      <div className={`col-sm-${detailWidth} col-4 mb-2`}>
        <time dateTime={showtime.startDate}>
          {!todayDateTime || !showStart.startOf('day').equals(todayDateTime) ? showStart.toLocaleString(DateTime.DATE_SHORT) : null}
        </time>
      </div>
    );
  }

  let priceDisplay = '→';
  if (price) {
    if (price.acitonStatus === 'ActiveActionStatus') {
      priceDisplay = (
        <Spinner />
      );
    } else if (price.object && price.object.price) {
      priceDisplay = `$${price.object.price}`;
    }
  }

  return (
    <div className="row align-items-center mb-2 mb-lg-0">
      <div className={`col-lg-${movieWidth} mb-2`}>
        {movieDisplay}
      </div>
      <div className={`col-lg-${theaterWidth} mb-2`}>
        {theaterDisplay}
      </div>
      <div className={`col-lg-${width} mb-2`}>
        <div className="row align-items-center">
          {dateDisplay}
          <div className={`col-sm-${detailWidth} col-4 mb-2`}>
            <time dateTime={showtime.startDate}>
              {showStart.toLocaleString(DateTime.TIME_SIMPLE)}
            </time>
          </div>
          <div className={`col-sm-${detailWidth} col-4 mb-2`}>
            <time dateTime={showEnd ? showEnd.toISO() : undefined}>
              {showEnd ? showEnd.toLocaleString(DateTime.TIME_SIMPLE) : undefined}
            </time>
          </div>
          <div className={`col-sm-${detailWidth} col-12`}>
            <a className={className.join(' ')} href={showtime.offers.url}>
              {priceDisplay}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Showtime;
