#!/usr/bin/env node
/**
 * append-report.js
 * Safe append-only writer for reports.json.
 * Usage: cat new-entry.json | node append-report.js
 *   OR:  node append-report.js path/to/new-entry.json
 *
 * Will NEVER overwrite existing entries. Will validate the file is a non-empty
 * array before writing. Aborts with non-zero exit on any error.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'public', 'data', 'reports.json');
const inputArg = process.argv[2];

function readEntry() {
  if (inputArg) return fs.readFileSync(inputArg, 'utf8');
  return fs.readFileSync(0, 'utf8'); // stdin
}

try {
  const raw = readEntry();
  const entry = JSON.parse(raw);

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    console.error('ERROR: input must be a single JSON object (the new report entry).');
    process.exit(2);
  }
  if (!entry.timestamp || !entry.id) {
    console.error('ERROR: entry missing required fields: timestamp, id');
    process.exit(2);
  }

  const existingRaw = fs.readFileSync(FILE, 'utf8');
  const existing = JSON.parse(existingRaw);
  if (!Array.isArray(existing) || existing.length === 0) {
    console.error('ERROR: existing reports.json is not a non-empty array. Refusing to write.');
    process.exit(3);
  }

  // Dedupe by id
  if (existing.some(e => e.id === entry.id)) {
    console.log('Entry with id', entry.id, 'already exists. No-op.');
    process.exit(0);
  }

  existing.push(entry);
  // Backup first
  fs.copyFileSync(FILE, FILE + '.bak');
  fs.writeFileSync(FILE, JSON.stringify(existing, null, 2));
  console.log('Appended. Total entries:', existing.length);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
