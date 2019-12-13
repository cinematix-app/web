import { DateTime } from 'luxon';
import dateFormat from './date-format';

/**
 * Get datetime string
 *
 * @param {string} date
 * @return {string}
 */
function getFormattedDateTime(today, date) {
  switch (date) {
    case 'today':
      return today;
    case 'tomorrow':
      return today
        ? DateTime.fromFormat(today, dateFormat).plus({ days: 1 }).toFormat(dateFormat)
        : null;
    default:
      return date;
  }
}

export default getFormattedDateTime;
