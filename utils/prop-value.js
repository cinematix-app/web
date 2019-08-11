function getPropValue(list, field) {
  return field.map((id) => {
    for (let i = 0; i < list.length; i += 1) {
      const option = list[i].options.find(({ value }) => id === value);
      if (option) {
        return option;
      }
    }

    return undefined;
  });
}

export default getPropValue;
