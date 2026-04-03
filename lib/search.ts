function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSearchText(value?: string | null) {
  return stripDiacritics(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function compactSearchText(value?: string | null) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function matchesSearchValue(
  value: string | null | undefined,
  search: string,
) {
  if (!value) {
    return false;
  }

  const normalizedSearch = normalizeSearchText(search);
  const compactSearch = compactSearchText(search);

  if (!normalizedSearch && !compactSearch) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value);
  const compactValue = compactSearchText(value);

  if (compactSearch && compactValue.includes(compactSearch)) {
    return true;
  }

  if (normalizedSearch && normalizedValue.includes(normalizedSearch)) {
    return true;
  }

  const tokens = normalizedSearch.split(/\s+/).filter(Boolean);
  return tokens.length > 1 && tokens.every((token) => normalizedValue.includes(token));
}

export function matchesSearchFields(
  values: Array<string | null | undefined>,
  search: string,
) {
  const normalizedSearch = normalizeSearchText(search);
  const compactSearch = compactSearchText(search);

  if (!normalizedSearch && !compactSearch) {
    return true;
  }

  return values.some((value) => matchesSearchValue(value, search));
}
