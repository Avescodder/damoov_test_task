export interface UrlParts {
  search: string;
  hash: string;
}

/** Reads a query/hash parameter, checking the hash fragment first. */
export function readParam(location: UrlParts, names: readonly string[]): string | null {
  return pick(location.hash, '#', names) ?? pick(location.search, '?', names);
}

function pick(raw: string, prefix: string, names: readonly string[]): string | null {
  const stripped = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  if (!stripped) {
    return null;
  }
  const params = new URLSearchParams(stripped);
  for (const name of names) {
    const value = params.get(name)?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}
