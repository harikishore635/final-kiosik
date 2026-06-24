// Diff a locale file's leaf keys against en.json. Usage: node scripts/i18n-diff.cjs <lang> [--write]
const fs = require('fs');
const path = require('path');

const lang = process.argv[2];
if (!lang) { console.error('usage: node scripts/i18n-diff.cjs <lang> [--write]'); process.exit(1); }
const write = process.argv.includes('--write');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

function flatten(obj, prefix = '', out = {}) {
  for (const k in obj) {
    const val = obj[k];
    const key = prefix ? prefix + '.' + k : k;
    if (val && typeof val === 'object' && !Array.isArray(val)) flatten(val, key, out);
    else out[key] = val;
  }
  return out;
}

const en = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8')).translation);
const target = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8')).translation);

const missing = Object.keys(en).filter((k) => !(k in target));
const extra = Object.keys(target).filter((k) => !(k in en));

console.log(lang, 'en keys:', Object.keys(en).length, 'target keys:', Object.keys(target).length);
console.log(lang, 'missing:', missing.length);
console.log(lang, 'extra:', extra.length, extra);

if (write && missing.length) {
  const out = {};
  for (const k of missing) out[k] = en[k];
  const outPath = path.join(__dirname, '..', `missing_${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('wrote', outPath);
} else if (missing.length) {
  console.log(JSON.stringify(missing));
}
