const assert = require('node:assert');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { searchCoins } = require('../script.js');

test('searchCoins handles fetch failure', async () => {
  const dom = new JSDOM('<div id="search-results"></div>', { runScripts: 'outside-only' });
  global.document = dom.window.document;
  global.window = dom.window;

  const originalFetch = global.fetch;
  global.fetch = () => Promise.reject(new Error('network error'));

  searchCoins('btc');

  // wait microtasks
  await new Promise(process.nextTick);

  assert.strictEqual(dom.window.document.getElementById('search-results').innerHTML, 'Search failed');

  global.fetch = originalFetch;
  delete global.document;
  delete global.window;
});
