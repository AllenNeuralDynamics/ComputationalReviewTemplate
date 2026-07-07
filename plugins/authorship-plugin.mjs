// authorship-plugin.mjs — MyST plugin: directive + transform
// Creates an anywidget node with author data baked in.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// Minimal, dependency-free YAML parser for MyST author files.
//
// MyST bundles its own dependencies, so `require('yaml')` cannot be resolved
// from a plugin, and this template is designed to run with a bare `npx myst`
// (no package.json / npm install). Rather than reintroduce that install step,
// we parse the YAML subset that author files actually use:
//   - block mappings and sequences, nested to any depth
//   - single-line flow collections: `[a, b]` and `{id: x, name: y}`
//   - scalars: double/single-quoted strings, booleans, integers, floats, null
//   - `#` line/inline comments and `---`/`...` document markers
// Genuinely unsupported constructs — multi-line block scalars (`|`, `>`),
// anchors/aliases (`&`, `*`), and multi-line flow collections — throw, so the
// caller's try/catch surfaces a clear error rather than silently mis-parsing.
function parseMiniYaml(text) {
  const stripComment = (s) => {
    let inS = false;
    let inD = false;
    for (let i = 0; i < s.length; i += 1) {
      const c = s[i];
      if (c === "'" && !inD) inS = !inS;
      else if (c === '"' && !inS) inD = !inD;
      else if (c === '#' && !inS && !inD && i > 0 && /\s/.test(s[i - 1])) return s.slice(0, i);
    }
    return s;
  };

  const tokens = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed === '---' || trimmed === '...' || trimmed.startsWith('#')) continue;
    const indent = rawLine.length - rawLine.replace(/^\s*/, '').length;
    const content = stripComment(rawLine.slice(indent)).replace(/\s+$/, '');
    if (content !== '') tokens.push({ indent, content });
  }

  const splitKeyValue = (content) => {
    const m = /^([A-Za-z0-9_.\-]+):(?:\s+([\s\S]*))?$/.exec(content);
    if (!m) return null;
    return { key: m[1], value: m[2] === undefined ? '' : m[2] };
  };

  // Coerce a single atomic scalar token to its JS value.
  const coerce = (raw) => {
    const v = raw.trim();
    if (v === '' || v === '~' || /^(null|Null|NULL)$/.test(v)) return null;
    if (/^(true|True|TRUE)$/.test(v)) return true;
    if (/^(false|False|FALSE)$/.test(v)) return false;
    if (v[0] === '"') {
      try { return JSON.parse(v); } catch { /* fall through to manual unescape */ }
      return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (v[0] === "'") return v.slice(1, -1).replace(/''/g, "'");
    if (/^[-+]?\d+$/.test(v)) return parseInt(v, 10);
    if (/^[-+]?(\d*\.\d+|\d+\.\d*)$/.test(v)) return parseFloat(v);
    if (v[0] === '&' || v[0] === '*') throw new Error('YAML anchors/aliases are not supported');
    return v;
  };

  // Parse a single-line flow collection: [ ... ] or { ... } (recursively).
  const parseFlow = (input) => {
    const s = input;
    let i = 0;
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i += 1; };
    const readToken = (isKey) => {
      ws();
      const q = s[i];
      if (q === '"' || q === "'") {
        i += 1;
        let out = '';
        while (i < s.length) {
          if (q === '"' && s[i] === '\\') { out += s[i + 1] ?? ''; i += 2; continue; }
          if (q === "'" && s[i] === "'" && s[i + 1] === "'") { out += "'"; i += 2; continue; }
          if (s[i] === q) { i += 1; break; }
          out += s[i]; i += 1;
        }
        return out;
      }
      const start = i;
      const stop = isKey ? ',]}:' : ',]}';
      while (i < s.length && !stop.includes(s[i])) i += 1;
      const t = s.slice(start, i).trim();
      return isKey ? t : coerce(t);
    };
    const value = () => {
      ws();
      if (s[i] === '[') return seq();
      if (s[i] === '{') return map();
      return readToken(false);
    };
    function seq() {
      const arr = [];
      i += 1; ws();
      if (s[i] === ']') { i += 1; return arr; }
      for (;;) {
        arr.push(value()); ws();
        if (s[i] === ',') { i += 1; continue; }
        if (s[i] === ']') { i += 1; return arr; }
        throw new Error('malformed flow sequence');
      }
    }
    function map() {
      const obj = {};
      i += 1; ws();
      if (s[i] === '}') { i += 1; return obj; }
      for (;;) {
        const k = readToken(true); ws();
        if (s[i] !== ':') throw new Error('malformed flow mapping');
        i += 1;
        obj[k] = value(); ws();
        if (s[i] === ',') { i += 1; continue; }
        if (s[i] === '}') { i += 1; return obj; }
        throw new Error('malformed flow mapping');
      }
    }
    const result = value();
    ws();
    if (i < s.length) throw new Error('trailing characters after flow collection');
    return result;
  };

  const parseScalar = (raw) => {
    const v = raw.trim();
    if (v === '|' || v === '>' || /^[|>][+-]?\d*$/.test(v)) {
      throw new Error('multi-line block scalars (| or >) are not supported');
    }
    if (v[0] === '[' || v[0] === '{') return parseFlow(v);
    return coerce(v);
  };

  let pos = 0;
  const isSeqItem = (tk) => tk.content === '-' || tk.content.startsWith('- ');

  function parseBlock(indent) {
    if (pos >= tokens.length) return null;
    return isSeqItem(tokens[pos]) ? parseSeq(indent) : parseMap(indent);
  }

  function parseMap(indent) {
    const obj = {};
    while (pos < tokens.length) {
      const tk = tokens[pos];
      if (tk.indent !== indent || isSeqItem(tk)) break;
      const kv = splitKeyValue(tk.content);
      if (!kv) { pos += 1; continue; }
      if (kv.value === '') {
        pos += 1;
        obj[kv.key] = pos < tokens.length && tokens[pos].indent > indent
          ? parseBlock(tokens[pos].indent)
          : null;
      } else {
        obj[kv.key] = parseScalar(kv.value);
        pos += 1;
      }
    }
    return obj;
  }

  function parseSeq(indent) {
    const arr = [];
    while (pos < tokens.length) {
      const tk = tokens[pos];
      if (tk.indent !== indent || !isSeqItem(tk)) break;
      if (tk.content === '-') {
        pos += 1;
        arr.push(pos < tokens.length && tokens[pos].indent > indent
          ? parseBlock(tokens[pos].indent)
          : null);
      } else {
        const itemContent = tk.content.slice(2);
        const itemIndent = indent + 2;
        if (splitKeyValue(itemContent)) {
          // Sequence item is a mapping whose first key sits on the dash line;
          // rewrite the token to that key's column and let parseMap consume it.
          tokens[pos] = { indent: itemIndent, content: itemContent };
          arr.push(parseMap(itemIndent));
        } else {
          arr.push(parseScalar(itemContent));
          pos += 1;
        }
      }
    }
    return arr;
  }

  return tokens.length ? parseBlock(tokens[0].indent) : null;
}

const authorshipDirective = {
  name: 'authorship-explorer',
  doc: 'Renders an interactive authorship contribution explorer widget.',
  options: {
    authors: {
      type: String,
      doc: 'Path to authors YAML file (default: ./authors.yml)',
    },
    'authors-alt': {
      type: String,
      doc: 'Path to alternate authors YAML file for toggle (e.g. ./authors-real.yml)',
    },
    'alt-label': {
      type: String,
      doc: 'Label for the alternate dataset (default: "Real contributors")',
    },
    'authors-alt2': {
      type: String,
      doc: 'Path to second alternate authors YAML file',
    },
    'alt2-label': {
      type: String,
      doc: 'Label for the second alternate dataset',
    },
    height: {
      type: String,
      doc: 'Widget height, e.g. "800px"',
    },
  },
  run(data) {
    return [
      {
        type: 'authorship-explorer',
        authorsPath: data.options?.authors || './authors.yml',
        authorsAltPath: data.options?.['authors-alt'] || null,
        altLabel: data.options?.['alt-label'] || 'Real contributors',
        authorsAlt2Path: data.options?.['authors-alt2'] || null,
        alt2Label: data.options?.['alt2-label'] || 'Large team',
        height: data.options?.height || '800px',
      },
    ];
  },
};

const authorshipTransform = {
  name: 'authorship-data-loader',
  stage: 'document',
  plugin: (opts, utils) => (tree, vfile) => {
    // Build section ID → heading text map from the document AST
    const sectionLabels = {};
    function collectHeadings(n) {
      if (!n) return;
      if (n.type === 'heading' && n.identifier) {
        const text = (n.children || [])
          .filter(c => c.type === 'text')
          .map(c => c.value)
          .join('');
        if (text) sectionLabels[n.identifier] = text;
      }
      if (n.children) for (const child of n.children) collectHeadings(child);
    }
    collectHeadings(tree);

    function transform(node) {
      if (!node) return;

      if (node.type === 'authorship-explorer') {
        const docDir = vfile?.path ? dirname(vfile.path) : process.cwd();
        const yamlPath = resolve(docDir, node.authorsPath || './authors.yml');

        try {
          const raw = readFileSync(yamlPath, 'utf-8');
          const fullData = parseMiniYaml(raw);

          // Helper: resolve affiliation ID strings to full objects
          function resolveAffiliations(data) {
            const contribs = data?.project?.contributors || data?.contributors || [];
            const affDefs = data?.project?.affiliations || data?.affiliations || [];
            const affMap = Object.fromEntries(affDefs.map(a => [a.id, a]));
            return contribs.map(c => {
              if (!c.affiliations) return c;
              return {
                ...c,
                affiliations: c.affiliations.map(aff =>
                  typeof aff === 'string' ? (affMap[aff] || { id: aff, name: aff }) : aff
                ),
              };
            });
          }

          const contributors = resolveAffiliations(fullData);

          // Load alternate authors if specified
          let altContributors = null;
          let altLabel = node.altLabel || 'Real contributors';
          if (node.authorsAltPath) {
            try {
              const altPath = resolve(docDir, node.authorsAltPath);
              const altRaw = readFileSync(altPath, 'utf-8');
              const altData = parseMiniYaml(altRaw);
              altContributors = resolveAffiliations(altData);
            } catch (altErr) {
              console.warn(`authorship-plugin: Alt authors error: ${altErr.message}`);
            }
          }

          // Load second alternate authors if specified
          let alt2Contributors = null;
          let alt2Label = node.alt2Label || 'Large team';
          if (node.authorsAlt2Path) {
            try {
              const alt2Path = resolve(docDir, node.authorsAlt2Path);
              const alt2Raw = readFileSync(alt2Path, 'utf-8');
              const alt2Data = parseMiniYaml(alt2Raw);
              alt2Contributors = resolveAffiliations(alt2Data);
            } catch (alt2Err) {
              console.warn(`authorship-plugin: Alt2 authors error: ${alt2Err.message}`);
            }
          }

          // Build the data envelope with primary + optional alt dataset
          const envelope = {
            primary: contributors,
            sourceFiles: [node.authorsPath || './authors.yml'],
          };
          if (altContributors) {
            envelope.alt = altContributors;
            envelope.altLabel = altLabel;
            if (node.authorsAltPath) envelope.sourceFiles.push(node.authorsAltPath);
          }
          if (alt2Contributors) {
            envelope.alt2 = alt2Contributors;
            envelope.alt2Label = alt2Label;
            if (node.authorsAlt2Path) envelope.sourceFiles.push(node.authorsAlt2Path);
          }

          // Convert to anywidget node
          node.type = 'anywidget';
          node.id = `authorship-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          node.esm = './authorship-widget.mjs';
          node.css = './authorship-widget.css';
          node.model = {
            authors: JSON.stringify(envelope),
            sectionLabels: JSON.stringify(sectionLabels),
            height: node.height || '800px',
          };
          delete node.authorsPath;
          delete node.authorsAltPath;
          delete node.altLabel;
          delete node.authorsAlt2Path;
          delete node.alt2Label;
          delete node.height;
        } catch (err) {
          console.warn(`authorship-plugin: Error: ${err.message}`);
          node.type = 'paragraph';
          node.children = [
            { type: 'text', value: `[Authorship Explorer: ${err.message}]` },
          ];
          delete node.authorsPath;
          delete node.height;
        }
      }

      if (node.children) {
        for (const child of node.children) {
          if (child) transform(child);
        }
      }
    }

    transform(tree);
  },
};

const plugin = {
  name: 'Authorship Explorer',
  directives: [authorshipDirective],
  transforms: [authorshipTransform],
};

export default plugin;
