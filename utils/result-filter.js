import { frame } from 'jsonld';

async function resultFilter(result, type) {
  const data = await frame(result, {
    '@context': result['@context'],
    '@type': type,
  });

  return data['@graph'] || [];
}

export default resultFilter;
