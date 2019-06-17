import { useReducer, useEffect } from 'react';
import Layout from '../components/layout';

const initialState = {
  fields: {
    zipCode: {
      value: '',
      valid: false,
    },
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'change':
      return {
        ...state,
        fields: {
          ...state.fields,
          [action.name]: {
            value: action.value,
            valid: action.valid,
          },
        },
      };
    default:
      throw new Error();
  }
}

function Index() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleChange = ({ target }) => dispatch({
    type: 'change',
    name: target.name,
    value: target.value,
    valid: target.checkValidity(),
  });

  useEffect(() => {
    // Wait for a valid Zip Code before doing anything.
    if (!state.fields.zipCode.valid) {
      return;
    }

    console.log(state.fields.zipCode.value);
  }, [
    state.fields.zipCode.value,
    state.fields.zipCode.valid,
  ])

  return (
    <Layout>
      <form>
        <div className="row form-group">
          <label className="col-auto col-form-label" htmlFor="zipCode">Zip Code</label>
          <div className="col">
            <input
              className="form-control form-control-sm"
              type="number"
              id="zipCode"
              name="zipCode"
              min="0"
              max="99999"
              required
              value={state.fields.zipCode.value}
              onChange={handleChange}
            />
          </div>
        </div>
      </form>
    </Layout>
  );
}

export default Index;
