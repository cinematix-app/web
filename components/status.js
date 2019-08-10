import { Fragment } from 'react';

function Status({ status, error, children }) {
  if (status === 'error') {
    return (
      <div className="alert alert-danger" role="alert">
          An error occured with the request to <a href={error.request.url} className="alert-link">{error.request.url}</a>
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
