import { getEventHandler } from '@cinematix/next-cloudflare';
import routesManifest from './.next/routes-manifest.json';

const handleEvent = getEventHandler(routesManifest);

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', handleEvent);
