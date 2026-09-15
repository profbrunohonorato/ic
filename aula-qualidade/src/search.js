export function filterTechnologies(technologies, searchTerm) {
  const term = searchTerm.trim().toLowerCase();

  if (!term) return technologies;

  return technologies.filter((technology) =>
    [technology.name, technology.category, technology.description]
      .join(' ')
      .toLowerCase()
      .includes(term),
  );
}
