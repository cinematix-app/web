import { Fragment } from 'react';
import Head from 'next/head';
import '../styles/style.scss';

function Layout({ children }) {
  return (
    <Fragment>
      <Head>
        <title>Cinematix</title>
      </Head>
      <header className="pt-2 pb-2 mb-4">
        <div className="container">
          <div className="row">
            <div className="col">
              <img src="/static/logo.svg" alt="Cinematix" />
            </div>
          </div>
        </div>
      </header>
      <div className="container">
        {children}
      </div>
    </Fragment>
  );
}

export default Layout;