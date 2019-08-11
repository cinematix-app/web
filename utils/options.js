function getOptions(list, field, searchResult = []) {
  const options = new Map();

  list.forEach(item => options.set(item['@id'].split(':').pop(), item.name));

  searchResult.forEach(({ value, label }) => {
    if (!options.has(value)) {
      options.set(value, label);
    }
  });

  field.forEach((id) => {
    if (!options.has(id)) {
      options.set(id, id);
    }
  });

  return [...options.entries()].map(([value, label]) => ({
    label,
    value,
  }));
}

export default getOptions;
