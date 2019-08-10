import { DateTime } from 'luxon';
import dateFormat from './date-format';

/**
 * Get today
 *
 * @param {string} today
 * @return {DateTime}
 */
function getTodayDateTime(today) {
  return today ? DateTime.fromFormat(today, dateFormat).startOf('day') : null;
}

export default getTodayDateTime;
