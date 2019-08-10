import { frame } from 'jsonld';
import context from './context';

async function resultFilter(result, type) {
  const data = await frame(result, {
    '@context': context,
    '@type': type,
  });

  return data['@graph'] || [];
}

export default resultFilter;
