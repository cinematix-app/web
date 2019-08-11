import getGroupLabel from './group-label';

function getPropOptions(list, field) {
  const groups = new Map();

  list.forEach((item) => {
    const type = item['@id'].split(':').shift();
    const set = groups.get(type) || new Set();
    set.add({
      label: item.name,
      value: item['@id'],
    });
    groups.set(type, set);
  });

  // Ensure that all of the values are in the options, if not, add them.
  field.forEach((id) => {
    const type = id.split(':').shift();
    const set = groups.get(type) || new Set();
    set.add({
      label: id,
      value: id,
    });
    groups.set(type, set);
  });

  return [...groups.entries()].map(([group, options]) => ({
    label: getGroupLabel(group),
    options: [...options.values()],
  }));
}

export default getPropOptions;
