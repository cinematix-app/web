import {
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { DateTime } from 'luxon';
import Select from 'react-select';
import useReactor from '@cinematix/reactor';
import reducer from '../context/reducer';
import dateFormat from '../utils/date-format';
import getTodayDateTime from '../utils/today-datetime';
import getOptions from '../utils/options';
import getPropValue from '../utils/prop-value';
import getPropOptions from '../utils/prop-options';
import createPropertySearchReactor from '../reactors/property-search';

const ticketingOptions = [
  { value: 'both', label: 'Both' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

const quickDates = ['today', 'tomorrow'];

const theaterSearchReactor = createPropertySearchReactor('theaters', 'P6644');
const movieSearchReactor = createPropertySearchReactor('movies', 'P5693');

function Form({
  locationDisabled,
  startDate,
}) {
  const [state, dispatch] = useContext(reducer);

  const handleChange = useCallback(({ target }) => {
    dispatch({
      type: 'change',
      name: target.name,
      value: target.type === 'checkbox' ? target.checked : target.value,
    });
  }, []);

  const handleListChange = list => data => dispatch({
    type: 'change',
    name: list,
    value: data ? data.map(({ value }) => value) : [],
  });

  const movieOptions = useMemo(
    () => getOptions(state.movies, state.fields.movies, state.search.movies.result),
    [state.movies, state.fields.movies, state.search.movies.result],
  );

  const theaterOptions = useMemo(
    () => getOptions(state.theaters, state.fields.theaters, state.search.theaters.result),
    [state.theaters, state.fields.theaters, state.search.theaters.result],
  );


  const ticketingChange = useCallback(({ value }) => dispatch({
    type: 'change',
    name: 'ticketing',
    value,
  }), []);

  const ticketingValue = useMemo(() => (
    ticketingOptions.find(({ value }) => value === state.fields.ticketing)
  ), [state.fields.ticketing]);

  const dayAfterTomorrowFormatted = useMemo(
    () => {
      const today = getTodayDateTime(state.today);

      return today ? today.plus({ days: 2 }).toFormat(dateFormat) : '';
    },
    [state.today],
  );

  const customStartDate = useMemo(
    () => !quickDates.includes(state.fields.startDate),
    [state.fields.startDate],
  );
  const customEndDate = useMemo(
    () => !quickDates.includes(state.fields.endDate),
    [state.fields.endDate],
  );

  const maxEndFormatted = useMemo(() => {
    if (!startDate) {
      return null;
    }
    const start = DateTime.fromFormat(startDate, dateFormat).startOf('day');

    return start.plus({ days: 5 }).toFormat(dateFormat);
  }, [startDate]);

  const {
    options: propsxOptions,
    value: propsxValue,
  } = useMemo(() => {
    const options = getPropOptions(state.props, state.fields.propsx);

    return {
      options,
      value: getPropValue(options, state.fields.propsx),
    };
  }, [state.props, state.fields.propsx]);

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

  const {
    options: propsOptions,
    value: propsValue,
  } = useMemo(() => {
    const options = getPropOptions(state.props, state.fields.props);

    return {
      options,
      value: getPropValue(options, state.fields.props),
    };
  }, [state.props, state.fields.props]);

  const theaterSearch = useReactor(theaterSearchReactor, dispatch);
  const movieSearch = useReactor(movieSearchReactor, dispatch);

  const submitCallback = useCallback(e => e.preventDefault(), []);

  return (
    <form onSubmit={submitCallback}>
      <div className="row form-group">
        <label className="col-2 col-lg-1 col-form-label text-nowrap" htmlFor="zipCode">Zip Code</label>
        <div className="col-md col-12">
          <input
            className="form-control"
            type="text"
            id="zipCode"
            name="zipCode"
            pattern="[0-9]{5}"
            value={state.fields.zipCode}
            onChange={handleChange}
            disabled={locationDisabled}
          />
        </div>
        <label className="col-auto col-form-label text-nowrap" htmlFor="limit">Max. Theaters</label>
        <div className="col-md col-12">
          <input
            className="form-control"
            type="number"
            id="limit"
            name="limit"
            min="0"
            value={state.fields.limit}
            onChange={handleChange}
            disabled={locationDisabled}
          />
        </div>
        <label className="col-auto col-form-label" htmlFor="ticketing">Ticketing</label>
        <div className="col-md col-12">
          <Select
            inputId="ticketing"
            name="ticketing"
            options={ticketingOptions}
            className="select-container"
            classNamePrefix="select"
            value={ticketingValue}
            onChange={ticketingChange}
            isDisabled={locationDisabled}
          />
        </div>
      </div>
      <div className="row form-group">
        <label className="col-2 col-lg-1 col-form-label" htmlFor="startDate">Start</label>
        <div className="input-group col-md-7 col-lg-8 col-12 flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <div className="btn-group w-100 w-md-auto" role="group">
              <button type="button" name="startDate" value="today" onClick={handleChange} aria-pressed={state.fields.startDate === 'today'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.startDate === 'today' ? 'active' : ''].join(' ')}>Today</button>
              <button type="button" name="startDate" value="tomorrow" onClick={handleChange} aria-pressed={state.fields.startDate === 'tomorrow'} className={['btn', 'btn-outline-secondary', state.fields.startDate === 'tomorrow' ? 'active' : ''].join(' ')}>Tomorrow</button>
              <button type="button" name="startDate" value={dayAfterTomorrowFormatted} onClick={handleChange} aria-pressed={customStartDate} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', customStartDate ? 'active' : ''].join(' ')}>Other</button>
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
        <div className="input-group col-md-3 col-lg-3 col-12 flex-md-nowrap">
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
      <div className="row form-group">
        <label className="col-2 col-lg-1 col-form-label" htmlFor="endDate">End</label>
        <div className="input-group col-md-7 col-lg-8 col-12 flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <div className="btn-group w-100 w-md-auto" role="group">
              <button type="button" name="endDate" value="today" onClick={handleChange} disabled={endDateTodayDisabled} aria-pressed={state.fields.endDate === 'today'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.endDate === 'today' ? 'active' : ''].join(' ')}>Today</button>
              <button type="button" name="endDate" value="tomorrow" onClick={handleChange} disabled={endDateTomorrowDisabled} aria-pressed={state.fields.endDate === 'tomorrow'} className={['btn', 'btn-outline-secondary', state.fields.endDate === 'tomorrow' ? 'active' : ''].join(' ')}>Tomorrow</button>
              <button type="button" name="endDate" value={dayAfterTomorrowFormatted} onClick={handleChange} aria-pressed={customStartDate} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', customEndDate ? 'active' : ''].join(' ')}>Other</button>
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
      <div className="row form-group">
        <label className="col-2 col-lg-1 col-form-label" htmlFor="theaters">Theaters</label>
        <div className="input-group col-md col-12 flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <div className="btn-group w-100 w-md-auto" role="group">
              <button type="button" name="theater" value="include" onClick={handleChange} aria-pressed={state.fields.theater === 'include'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.theater === 'include' ? 'active' : ''].join(' ')}>Include</button>
              <button type="button" name="theater" value="exclude" onClick={handleChange} aria-pressed={state.fields.theater === 'exclude'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', state.fields.theater === 'exclude' ? 'active' : ''].join(' ')}>Exclude</button>
            </div>
          </div>
          <Select
            inputId="theaters"
            name="theaters"
            options={theaterOptions}
            className="select-container rounded-bottom rounded-top-0 rounded-md-left-0 rounded-md-right"
            classNamePrefix="select"
            value={state.fields.theaters.map(
              id => theaterOptions.find(({ value }) => id === value),
            )}
            onChange={handleListChange('theaters')}
            onInputChange={useCallback(value => theaterSearch.next(value))}
            isLoading={state.search.theaters.fetching}
            isMulti
          />
        </div>
      </div>
      <div className="row form-group">
        <label className="col-2 col-lg-1 col-form-label" htmlFor="movies">Movies</label>
        <div className="input-group col-md col-12 flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <div className="btn-group w-100 w-md-auto" role="group">
              <button type="button" name="movie" value="include" onClick={handleChange} aria-pressed={state.fields.movie === 'include'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-left', state.fields.movie === 'include' ? 'active' : ''].join(' ')}>Include</button>
              <button type="button" name="movie" value="exclude" onClick={handleChange} aria-pressed={state.fields.movie === 'exclude'} className={['btn', 'btn-outline-secondary', 'rounded-bottom-0', 'rounded-md-right-0', state.fields.movie === 'exclude' ? 'active' : ''].join(' ')}>Exclude</button>
            </div>
          </div>
          <Select
            inputId="movies"
            name="movies"
            options={movieOptions}
            className="select-container rounded-bottom rounded-top-0 rounded-md-left-0 rounded-md-right"
            classNamePrefix="select"
            value={
                state.fields.movies.map(id => movieOptions.find(({ value }) => id === value))
            }
            onChange={handleListChange('movies')}
            onInputChange={useCallback(value => movieSearch.next(value))}
            isLoading={state.search.movies.fetching}
            isMulti
          />
        </div>
      </div>
      <div className="row form-group">
        <span className="col-2 col-lg-1 col-form-label">Properties</span>
        <div className="col-md col-12 mb-2 mb-md-0 pr-md-0 input-group align-items-stretch flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left" htmlFor="props">Include</label>
          </div>
          <Select
            inputId="props"
            name="props"
            options={propsOptions}
            className={['select-container', 'rounded-0', 'align-self-stretch'].join(' ')}
            classNamePrefix="select"
            value={propsValue}
            onChange={handleListChange('props')}
            isMulti
          />
        </div>
        <div className="col-md col-12 mb-2 mb-md-0 pl-md-0 input-group align-items-stretch flex-md-nowrap">
          <div className="input-group-prepend w-100 w-md-auto">
            <label className="input-group-text w-100 w-md-auto rounded-bottom-0 rounded-top rounded-md-right-0 rounded-md-left-0" htmlFor="propsx">Exclude</label>
          </div>
          <Select
            inputId="propsx"
            name="propsx"
            options={propsxOptions}
            className={['select-container', 'rounded-top-0', 'rounded-md-left-0', 'rounded-md-right', 'align-self-stretch'].join(' ')}
            classNamePrefix="select"
            value={propsxValue}
            onChange={handleListChange('propsx')}
            isMulti
          />
        </div>
      </div>
      <div className="row form-group">
        <div className="col-2 col-lg-1">
          <button type="button" className="btn btn-outline-secondary btn-block">Price</button>
        </div>
        <div className="input-group col-md col-12">
          <div className="input-group-prepend">
            <span className="input-group-text">$</span>
          </div>
          <input
            className="form-control"
            type="number"
            id="priceLow"
            name="priceLow"
            // value={state.fields.zipCode}
            // onChange={handleChange}
            // disabled={locationDisabled}
            disabled
          />
          <div className="input-group-append">
            <span className="input-group-text">.00</span>
          </div>
        </div>
        <div className="input-group col-md col-12">
          <div className="input-group-prepend">
            <span className="input-group-text">$</span>
          </div>
          <input
            className="form-control"
            type="number"
            id="priceHigh"
            name="priceHigh"
            // value={state.fields.zipCode}
            // onChange={handleChange}
            // disabled={locationDisabled}
            disabled
          />
          <div className="input-group-append">
            <span className="input-group-text">.00</span>
          </div>
        </div>
      </div>
    </form>
  );
}

export default Form;
