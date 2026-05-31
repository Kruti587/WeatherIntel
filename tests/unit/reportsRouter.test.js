const test = require('node:test');
const assert = require('node:assert/strict');

const reportsRouter = require('../../routes/reports');

test('reports router exposes documented report endpoints under /api', () => {
  const routes = reportsRouter.stack
    .map((layer) => layer.route)
    .filter(Boolean)
    .map((route) => ({
      path: route.path,
      methods: Object.keys(route.methods).filter((method) => route.methods[method]),
    }));

  assert.deepEqual(routes, [
    { path: '/admin-summary', methods: ['get'] },
    { path: '/daily-report', methods: ['get'] },
  ]);
});
