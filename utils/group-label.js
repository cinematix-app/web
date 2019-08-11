function getGroupLabel(key) {
  switch (key) {
    case 'xa':
      return 'Theater Amenity';
    case 'xf':
      return 'Movie Format';
    case 'xg':
      return 'Movie Genre';
    case 'xp':
      return 'Showtime Feature';
    case 'xr':
      return 'Movie Rating';
    default:
      return '';
  }
}

export default getGroupLabel;
