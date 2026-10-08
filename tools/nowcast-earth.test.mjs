import test from 'node:test';
import assert from 'node:assert/strict';
import { domainFrames, forecastTime, forecastFrames, stormOptions, selectStorm } from './nowcast-earth.mjs';

test('satellite timeline uses published scans, skips gaps and never invents future imagery', () => {
  const now = Date.parse('2026-10-08T00:20:00Z');
  const frames = domainFrames(['2026-10-07T23:50:00Z/2026-10-08T00:00:00Z/PT10M', '2026-10-08T00:20:00Z/2026-10-08T01:00:00Z/PT10M', 'bad'], now);
  assert.deepEqual(frames.map(f => new Date(f.time).toISOString()), ['2026-10-07T23:50:00.000Z', '2026-10-08T00:00:00.000Z', '2026-10-08T00:20:00.000Z']);
  assert.equal(domainFrames(['2026-01-01/2026-01-02/PT10M'], now).length, 0);
  assert.equal(domainFrames(['2026-10-07/2026-10-08T00:20:00Z/PT0M'], now).length, 0);
});

test('NHC valid times cross month and year boundaries in UTC', () => {
  assert.equal(forecastTime({ validtime: '01/0600', idp_filedate: Date.parse('2026-12-31T21:00:00Z') }), Date.parse('2027-01-01T06:00:00Z'));
  assert.equal(forecastTime({ validtime: '31/1800', idp_filedate: Date.parse('2026-11-01T00:00:00Z') }), Date.parse('2026-10-31T18:00:00Z'));
  assert.equal(forecastTime({ validtime: 'bad' }), null);
});

const point = (key, name, basin, coordinates, tau, validtime = '08/0600') => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties: { idp_subset: key, stormname: name, basin, tau, validtime, idp_filedate: Date.parse('2026-10-08T06:00:00Z') } });
test('storm selection prefers the nearby Atlantic storm and keeps storms separate', () => {
  const features = [point('ep1','Pacific','EP',[-88,30],0), point('al2','Distant','AL',[-45,18],0), point('al1','Gulf','AL',[-91,26],0), point('al1','Gulf','AL',[-88,29],24,'09/0600')];
  assert.deepEqual(stormOptions(features).map(f => f.key), ['al1','al2','ep1']);
  assert.equal(selectStorm(features, 'al1').features.length, 2);
  assert.deepEqual(forecastFrames(features, 'al1').map(f => f.feature.properties.tau), [0,24]);
  assert.deepEqual(forecastFrames(features, 'none'), []);
});
