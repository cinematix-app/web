function displayFilterExclusive(values, option, data) {
  if (values.length === 0) {
    return true;
  }

  const match = values.includes(data['@id'].split(':').pop());

  if (option === 'exclude' && match) {
    return false;
  }

  if (option === 'include' && !match) {
    return false;
  }

  return true;
}

export default displayFilterExclusive;
