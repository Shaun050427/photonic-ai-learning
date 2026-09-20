const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync(require('node:path').join(__dirname, '..', 'progress-sync.js'), 'utf8');

function device(server, savedLocal = {}, savedSession = {}) {
  const localMap = new Map(Object.entries(savedLocal));
  const sessionMap = new Map(Object.entries(savedSession));
  class Element {
    constructor() { this.children = []; this.hidden = false; this.value = ''; this.style = {}; this.dataset = {}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(type, fn) { this[`on${type}`] = fn; }
    setAttribute() {}
    click() { this.onclick?.(); }
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  const context = {
    document: { getElementById: get, createElement: () => new Element(), createTextNode: s => s, addEventListener() {} },
    localStorage: storage(localMap), sessionStorage: storage(sessionMap),
    fetch: async (url, options = {}) => {
      if (!url.includes('/Shaun050427/photonic-ai-learning-data/')) throw Error('wrong repository');
      if (options.method === 'PUT') {
        const input = JSON.parse(options.body);
        if (input.sha !== server.sha) return { ok: false, status: 409, json: async () => ({ message: 'Conflict' }) };
        server.data = JSON.parse(Buffer.from(input.content, 'base64').toString('utf8'));
        server.sha = 'sha-' + (++server.number);
        return { ok: true, json: async () => ({ content: { sha: server.sha } }) };
      }
      return { ok: true, json: async () => ({ sha: server.sha, content: Buffer.from(JSON.stringify(server.data)).toString('base64') }) };
    },
    TextEncoder, TextDecoder, Uint8Array, btoa, atob, Date, JSON, console,
    setInterval() {}, setTimeout() {}, clearTimeout() {}, confirm: () => true
  };
  vm.runInNewContext(script, context);
  return { get, localMap, sessionMap, async sync() { await get('syncNow').onclick(); },
    checkModule(i) { const el = get('moduleProgress').children[i].children[0].children[0]; el.checked = true; el.onchange(); } };
}

const emptyRemote = () => ({ schemaVersion: 1, data: { modules: {}, days: {} } });
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };

test('two devices exchange progress through the private file', async () => {
  const server = { sha: 'initial', number: 0, data: emptyRemote() };
  const token = { photonicProgressToken_v1: 'test-token' };
  const a = device(server, {}, token); await flush();
  a.checkModule(0); await a.sync(); await flush();
  assert.equal(server.data.data.modules.field, true);
  const b = device(server, {}, token); await flush();
  assert.equal(b.get('moduleProgress').children[0].children[0].children[0].checked, true);
});

test('concurrent changes pause without overwriting either copy', async () => {
  const server = { sha: 'initial', number: 0, data: emptyRemote() };
  const token = { photonicProgressToken_v1: 'test-token' };
  const a = device(server, {}, token), b = device(server, {}, token); await flush();
  a.checkModule(0); await a.sync(); await flush();
  b.checkModule(1); await b.sync(); await flush();
  assert.equal(b.get('syncConflict').hidden, false);
  assert.equal(server.data.data.modules.interference, false);
  assert.equal(JSON.parse(b.localMap.get('photonicProgress_v1')).modules.interference, true);
});
