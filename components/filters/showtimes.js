import { useContext, useMemo } from 'react';
import { DateTime } from 'luxon';
import reducer from '../../context/reducer';
import useHandleChange from '../../hooks/handle-change';
import dateFormat from '../../utils/date-format';
import getTodayDateTime from '../../utils/today-datetime';
import getFormattedDateTime from '../../utils/formatted-datetime';
import PropSelect from '../select/prop';
import PropMultiSelect from '../select/prop-multi';

const quickDates = ['today', 'tomorrow'];

function Showtimes() {
  const [state, dispatch] = useContext(reducer);
  const handleChange = useHandleChange(dispatch);

  const startDate = useMemo(
    () => getFormattedDateTime(state.today, state.fields.startDate),
    [state.today, state.fields.startDate],
  );

  const customStartDate = useMemo(
    () => !quickDates.includes(state.fields.startDate),
    [state.fields.startDate],
  );

  const customEndDate = useMemo(
    () => !quickDates.includes(state.fields.endDate),
    [state.fields.endDate],
  );

  const dayAfterTomorrowFormatted = useMemo(
    () => {
      const today = getTodayDateTime(state.today);

      return today ? today.plus({ days: 2 }).toFormat(dateFormat) : '';
    },
    [state.today],
  );

  const {
    today: endDateTodayDisabled,
    tomorrow: endDateTomorrowDisabled,
  } = useMemo(() => {
    if (!startDate || !state.today) {
      return {
        today: false,
        tomorrow: false,
      };
    }

    const start = DateTime.fromFormat(startDate, dateFormat).startOf('day');
    const today = getTodayDateTime(state.today);

    return {
      today: start > today,
      tomorrow: start > today.plus({ days: 1 }),
    };
  }, [state.today, startDate]);

  const maxEndFormatted = useMemo(() => {
    if (!startDate) {
      return null;
    }
    const start = DateTime.fromFormat(startDate, dateFormat).startOf('day');

    return start.plus({ days: 5 }).toFormat(dateFormat);
  }, [startDate]);

  return (
    <>
      <div className="form-group">
        <label htmlFor="startDate">Start</label>
        <div className="row">
          <div className="input-group col-md-9 col-12 flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <div className="btn-group w-100 w-md-auto" role="group">
                <button
                  type="button"
                  name="startDate"
                  value="today"
                  onClick={handleChange}
                  aria-pressed={state.fields.startDate === 'today'}
                  className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.startDate === 'today' ? 'active' : ''].join(' ')}
                >
                    Today
                </button>
                <button
                  type="button"
                  name="startDate"
                  value="tomorrow"
                  onClick={handleChange}
                  aria-pressed={state.fields.startDate === 'tomorrow'}
                  className={['btn', 'btn-outline-secondary', state.fields.startDate === 'tomorrow' ? 'active' : ''].join(' ')}
                >
                    Tomorrow
                </button>
                <button
                  type="button"
                  name="startDate"
                  value={dayAfterTomorrowFormatted}
                  onClick={handleChange}
                  aria-pressed={customStartDate}
                  className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', customStartDate ? 'active' : ''].join(' ')}
                >
                    Other
                </button>
              </div>
            </div>
            <input
              className="form-control rounded-0 rounded-md-left-0 rounded-md-right"
              type="date"
              id="startDate"
              name="startDate"
              min={state.today || ''}
              value={customStartDate ? state.fields.startDate : ''}
              disabled={!customStartDate}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
              required
            />
          </div>
          <div className="input-group col-md-3 col-12 flex-md-nowrap">
            <input
              className="form-control rounded-bottom rounded-top-0 rounded-md"
              type="time"
              id="startTime"
              name="startTime"
              value={state.fields.startTime}
              placeholder="HH:MM"
              pattern="[0-9]{2}:[0-9]{2}"
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="endDate">End</label>
        <div className="row">
          <div className="input-group col-md-9 col-12 flex-md-nowrap">
            <div className="input-group-prepend w-100 w-md-auto">
              <div className="btn-group w-100 w-md-auto" role="group">
                <button
                  type="button"
                  name="endDate"
                  value="today"
                  onClick={handleChange}
                  disabled={endDateTodayDisabled}
                  aria-pressed={state.fields.endDate === 'today'}
                  className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.endDate === 'today' ? 'active' : ''].join(' ')}
                >
                    Today
                </button>
                <button
                  type="button"
                  name="endDate"
                  value="tomorrow"
                  onClick={handleChange}
                  disabled={endDateTomorrowDisabled}
                  aria-pressed={state.fields.endDate === 'tomorrow'}
                  className={['btn', 'btn-outline-secondary', state.fields.endDate === 'tomorrow' ? 'active' : ''].join(' ')}
                >
                    Tomorrow
                </button>
                <button
                  type="button"
                  name="endDate"
                  value={dayAfterTomorrowFormatted}
                  onClick={handleChange}
                  aria-pressed={customStartDate}
                  className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', customEndDate ? 'active' : ''].join(' ')}
                >
                    Other
                </button>
              </div>
            </div>
            <input
              className="form-control rounded-0 rounded-md-left-0 rounded-md-right"
              type="date"
              id="endDate"
              name="endDate"
              min={startDate}
              max={maxEndFormatted}
              value={customEndDate ? state.fields.endDate : ''}
              disabled={!customEndDate}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
              required
            />
          </div>
          <div className="input-group col-md-3 col-lg-3 col-12 flex-md-nowrap">
            <input
              className="form-control rounded-bottom rounded-top-0 rounded-md"
              type="time"
              id="endTime"
              name="endTime"
              value={state.fields.endTime}
              placeholder="HH:MM"
              pattern="[0-9]{2}:[0-9]{2}"
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      <div className="form-group">
        <label>Formats</label>
        <PropSelect id="formats" button="format" />
      </div>
      <div className="form-group">
        <label>Properties</label>
        <PropMultiSelect id="props" />
      </div>
    </>
  );
}

export default Showtimes;
