import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyScore, fuzzyFilter } from '../src/shared/fuzzy.ts';

test('fuzzyScore: empty query matches everything with score 0', () => {
  assert.deepEqual(fuzzyScore('', 'Give Treat'), { score: 0, positions: [] });
  assert.deepEqual(fuzzyScore('   ', 'Quit'), { score: 0, positions: [] });
});

test('fuzzyScore: non-subsequence returns null', () => {
  assert.equal(fuzzyScore('xyz', 'Give Treat'), null);
  assert.equal(fuzzyScore('treats', 'treat'), null); // query longer than target
});

test('fuzzyScore: exact prefix beats mid-string match', () => {
  const prefix = fuzzyScore('swap', 'Swap to Biscuit');
  const mid = fuzzyScore('swap', 'Petswapper'); // no boundary before 'swap'
  assert.ok(prefix && mid);
  assert.ok(prefix.score > mid.score, `prefix ${prefix.score} should beat mid ${mid.score}`);
});

test('fuzzyScore: word-boundary hits beat interior hits', () => {
  const boundary = fuzzyScore('t', 'Give Treat');
  const interior = fuzzyScore('t', 'Settings');
  assert.ok(boundary && interior);
  assert.ok(boundary.score > interior.score, `boundary ${boundary.score} should beat interior ${interior.score}`);
});

test('fuzzyScore: camelCase humps get the boundary bonus', () => {
  const camel = fuzzyScore('s', 'openSettings');
  const plain = fuzzyScore('s', 'opensettings');
  assert.ok(camel && plain);
  assert.ok(camel.score > plain.score, `camel ${camel.score} should beat plain ${plain.score}`);
});

test('fuzzyScore: consecutive runs beat scattered matches', () => {
  const consecutive = fuzzyScore('tre', 'Treat');
  const scattered = fuzzyScore('tre', 'Toggle Roam Everywhere');
  assert.ok(consecutive && scattered);
  assert.ok(consecutive.score > scattered.score);
});

test('fuzzyFilter: empty query keeps all items in order', () => {
  const items = ['beta', 'alpha', 'gamma'];
  const out = fuzzyFilter('', items, (s) => s);
  assert.deepEqual(out.map((s) => s.item), items);
});

test('fuzzyFilter: sorts best match first, drops non-matches', () => {
  const commands = ['Swap to Biscuit', 'Swap to Nova', 'Give Treat', 'Quit'];
  const out = fuzzyFilter('swap', commands, (s) => s).map((s) => s.item);
  assert.deepEqual(out, ['Swap to Biscuit', 'Swap to Nova']);
});

test('fuzzyFilter: boundary-heavy query ranks the right command first', () => {
  const commands = ['Scale 2×', 'Swap to Biscuit (Corgi)', 'Reset pet position'];
  const out = fuzzyFilter('sb', commands, (s) => s).map((s) => s.item);
  // 's'+'b' hits two word boundaries in "Swap to Biscuit" — must win.
  assert.equal(out[0], 'Swap to Biscuit (Corgi)');
});
