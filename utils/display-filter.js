function displayFilter(include, exclude, data) {
  if (include.length !== 0) {
    if (!data) {
      return false;
    }

    const match = include.find((id) => {
      if (Array.isArray(data)) {
        return data.find(a => a['@id'] === id);
      }

      return data['@id'];
    });

    if (!match) {
      return false;
    }
  }

  if (exclude.length !== 0) {
    if (!data) {
      return true;
    }

    const match = exclude.find((id) => {
      if (Array.isArray(data)) {
        return data.find(a => a['@id'] === id);
      }

      return data['@id'] === id;
    });

    if (match) {
      return false;
    }
  }

  return true;
}

export default displayFilter;
