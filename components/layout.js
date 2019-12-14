import { Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import '../styles/style.scss';

function Layout({ children }) {
  const title = 'Cinematix';
  const description = 'A faster, better way to find movie showtimes that work for you.';
  return (
    <Fragment>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content="https://cinematix.app/" />
        <meta property="og:image" content="https://cinematix.app/static/og2.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <header className="pt-2 pb-2 mb-4">
        <div className="container">
          <div className="row">
            <div className="col">
              <Link href="/">
                <a>
                  <img src="/static/logo.svg" alt="Cinematix" />
                </a>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="container d-flex flex-column flex-grow-1">
        {children}
      </main>
    </Fragment>
  );
}

export default Layout;
