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
          An error occured with the request to <a href={error.request.url} className="alert-link">{error.request.url}</a>
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
