// Reads a pasted JSON record exactly as written, for listing its fields.
//
// JSON.parse is not enough here: it moves integer-like keys ("2", "10") ahead of the others and
// keeps only the last of two duplicate keys, so a record's own field list would be silently
// reordered or merged. This reader keeps every key in source order and reports duplicates.
// JSON.parse still runs first, so syntax errors carry the browser's standard message.

const SCALAR_TYPES = new Set(['string', 'number', 'boolean', 'null']);

export const parseJsonOrdered = (text) => {
  JSON.parse(text); // throws SyntaxError for anything that isn't valid JSON

  let i = 0;
  const duplicates = [];
  const skipWs = () => {
    while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++;
  };
  const readString = () => {
    const start = i;
    i++;
    while (text[i] !== '"') {
      if (text[i] === '\\') i++;
      i++;
    }
    i++;
    return JSON.parse(text.slice(start, i));
  };
  const readValue = (segments) => {
    skipWs();
    const c = text[i];
    if (c === '{') {
      i++;
      const entries = [];
      const seen = new Set();
      skipWs();
      if (text[i] === '}') { i++; return { type: 'object', entries }; }
      for (;;) {
        skipWs();
        const key = readString();
        skipWs();
        i++; // ':'
        const node = readValue([...segments, key]);
        if (seen.has(key)) duplicates.push([...segments, key]);
        seen.add(key);
        entries.push([key, node]);
        skipWs();
        if (text[i] === ',') { i++; continue; }
        i++; // '}'
        return { type: 'object', entries };
      }
    }
    if (c === '[') {
      i++;
      const items = [];
      skipWs();
      if (text[i] === ']') { i++; return { type: 'array', items }; }
      for (;;) {
        items.push(readValue([...segments, '[]']));
        skipWs();
        if (text[i] === ',') { i++; continue; }
        i++; // ']'
        return { type: 'array', items };
      }
    }
    if (c === '"') return { type: 'string', value: readString() };
    if (text.startsWith('true', i)) { i += 4; return { type: 'boolean', value: true }; }
    if (text.startsWith('false', i)) { i += 5; return { type: 'boolean', value: false }; }
    if (text.startsWith('null', i)) { i += 4; return { type: 'null', value: null }; }
    const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    i += m[0].length;
    return { type: 'number', value: Number(m[0]) };
  };

  const root = readValue([]);
  return { root, duplicates };
};

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// Display form of a path: $.employee.contact.email, $["Work Email"], $.skills[], $[""]
export const formatJsonPath = (segments) =>
  '$' + segments.map((s) => (s === '[]' ? '[]' : IDENTIFIER.test(s) ? `.${s}` : `[${JSON.stringify(s)}]`)).join('');

const typeLabel = (node) => {
  if (node.type === 'object') return node.entries.length ? 'object' : 'empty object';
  if (node.type === 'array') return node.items.length ? 'array' : 'empty array';
  return node.type;
};

// Lists every path found in a record (or in each record of a top-level array of records), in the
// order first seen. Paths that recur across records or array items are listed once, with every
// type seen there. Only a top-level field holding a plain value is offered for mapping: the
// configuration API stores one source field name per mapping and defines no nested-path syntax.
export const discoverRecordFields = (text) => {
  const { root, duplicates } = parseJsonOrdered(text);

  let records;
  if (root.type === 'object') records = [root];
  else if (root.type === 'array' && root.items.length > 0 && root.items.every((n) => n.type === 'object')) records = root.items;
  else if (root.type === 'array' && root.items.length === 0) {
    return { error: 'The array is empty — paste at least one record object' };
  } else if (root.type === 'array') {
    return { error: 'A top-level array must contain record objects, e.g. [{"name": "…"}, {"name": "…"}]' };
  } else {
    return { error: `Paste a record object, e.g. {"name": "…"} — not a single ${root.type} value` };
  }

  const byPath = new Map();
  const visit = (node, segments) => {
    if (segments.length) {
      const id = JSON.stringify(segments);
      let field = byPath.get(id);
      if (!field) {
        field = { segments, path: formatJsonPath(segments), types: [], example: undefined };
        byPath.set(id, field);
      }
      const t = typeLabel(node);
      if (!field.types.includes(t)) field.types.push(t);
      if (field.example === undefined && SCALAR_TYPES.has(node.type) && node.type !== 'null') field.example = node.value;
    }
    if (node.type === 'object') node.entries.forEach(([key, child]) => visit(child, [...segments, key]));
    if (node.type === 'array') node.items.forEach((child) => visit(child, [...segments, '[]']));
  };
  records.forEach((record) => visit(record, []));

  const fields = [...byPath.values()].map((f) => {
    const scalarOnly = f.types.every((t) => SCALAR_TYPES.has(t));
    const topLevel = f.segments.length === 1;
    let note = '';
    if (!topLevel) note = 'nested';
    else if (!scalarOnly) note = 'holds an object or array';
    else if (f.segments[0] === '') note = 'empty field name';
    return { ...f, depth: f.segments.length, mappable: topLevel && scalarOnly && f.segments[0] !== '', note };
  });

  return {
    records: records.length,
    fields,
    mappableKeys: fields.filter((f) => f.mappable).map((f) => f.segments[0]),
    duplicates: duplicates.map(formatJsonPath),
  };
};
