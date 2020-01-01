import { Fragment } from 'react';
import Spinner from './spinner';

function Status({
  isEmpty,
  status,
  error,
  children,
}) {
  if (isEmpty && status === 'fetching') {
    return (
      <Spinner />
    );
  }

  if (status === 'error') {
    return (
      <div className="error">
        <div className="alert alert-danger" role="alert">
          An error occured with a request to <a href={error.response.url} className="alert-link">{error.response.url}</a>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      {children}
    </Fragment>
  );
}

export default Status;
