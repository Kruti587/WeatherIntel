const test = require('node:test');
const assert = require('node:assert/strict');

const { parseEnvContent } = require('../../config/env');

test('parseEnvContent reads plain, quoted, and exported env variables', () => {
  const parsed = parseEnvContent(`
# Comment line
PORT=3000
TARGET_CITY="Bengaluru"
export CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
DB_PASSWORD='secret'
`);

  assert.deepEqual(parsed, {
    PORT: '3000',
    TARGET_CITY: 'Bengaluru',
    CORS_ORIGIN: 'http://localhost:3000,http://127.0.0.1:3000',
    DB_PASSWORD: 'secret',
  });
});

test('parseEnvContent skips invalid lines', () => {
  const parsed = parseEnvContent(`
JUST_TEXT
=missing_key
VALID_KEY=value
`);

  assert.deepEqual(parsed, {
    VALID_KEY: 'value',
  });
});
