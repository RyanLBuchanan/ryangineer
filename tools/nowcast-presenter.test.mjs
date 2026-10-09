import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {presenterUrl} from './nowcast-presenter.mjs';
test('presenter link contains the selected place and rounded coordinates',()=>{const url=new URL(presenterUrl({lat:30.2944,lon:-87.5736,name:'Orange Beach, AL'}));assert.equal(url.origin,'https://ridiantechnologies.com');assert.equal(url.pathname,'/nowcast/presenter.html');assert.equal(url.searchParams.get('place'),'Orange Beach, AL');assert.equal(url.searchParams.get('lon'),'-87.5736');});
test('presenter opens above weather with an accessible bypass and keeps existing tools',()=>{const html=readFileSync(new URL('./nowcast.html',import.meta.url),'utf8');assert.ok(html.indexOf('id="presenter-panel"')<html.indexOf('class="panel weather-hero"'));assert.match(html,/id="presenter-skip" href="#current-heading"/);assert.match(html,/id="current-heading" tabindex="-1"/);for(const id of ['earth-panel','alerts','radar-panel','family-summary'])assert.match(html,new RegExp(`id="${id}"`));assert.doesNotMatch(html,/embed\.liveavatar\.com\/v1\/f46a2ff7/);});
