import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewClientSource } from './check-supabase-client-source.mjs';

const good = `const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;`;

test('accepts environment-based client (including line wrapping)', () => {
  assert.deepEqual(reviewClientSource(good), []);
});
test('rejects churchapp hardcoded client even if env names appear in comments', () => {
  const old = `// VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY
const SUPABASE_URL = "https://crjdsxxkspvdwknrmijs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "not-a-real-key";`;
  const errors = reviewClientSource(old);
  assert.equal(errors.length, 3);
});
test('rejects missing publishable key env reference', () => {
  const errors = reviewClientSource('const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /PUBLISHABLE_KEY/);
});
