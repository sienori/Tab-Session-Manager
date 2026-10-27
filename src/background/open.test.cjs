const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const flush = () => new Promise(resolve => setImmediate(resolve));
const fallbackUrl = url => `https://replacement.test/open_faild?url=${encodeURIComponent(url)}`;

function makeSession(windowCount = 1, tabCount = 3) {
  const windows = {};
  for (let win = 0; win < windowCount; win++) {
    const tabs = {};
    for (let index = tabCount - 1; index >= 0; index--) {
      const id = win * tabCount + index + 1;
      tabs[`tab-${id}`] = {
        id,
        index,
        openerTabId: index > 0 ? id - 1 : undefined,
        url: `https://example.test/${win}/${index}`,
        title: `Tab ${id}`,
        active: index === 0,
        pinned: false,
        incognito: false
      };
    }
    windows[`window-${win}`] = tabs;
  }
  return { id: 1, tag: [], windows };
}

async function loadOpen(settings = {}) {
  const events = [];
  const pending = [];
  const timers = [];
  const errors = [];
  const calls = [];
  let maxPending = 0;
  let nextWindowId = 100;
  let nextTabId = 100000;
  const currentWindow = {
    id: 1,
    incognito: false,
    tabs: [{ id: 10, index: 0, windowId: 1, pinned: false }]
  };
  const browser = {
    tabs: {
      query: async () => currentWindow.tabs,
      create(options) {
        const call = { ...options };
        calls.push(call);
        events.push({ type: "create", ...call });
        const result = new Promise((resolve, reject) => pending.push({ call, resolve, reject }));
        maxPending = Math.max(maxPending, pending.length);
        return result;
      },
      remove: async tabId => events.push({ type: "remove", tabId })
    },
    windows: {
      WINDOW_ID_NONE: -1,
      create: async () => {
        const windowId = nextWindowId++;
        events.push({
          type: "window",
          windowId,
          pending: pending.length,
          completed: events.filter(event => event.type === "success").length
        });
        return {
          id: windowId,
          incognito: false,
          tabs: [{ id: windowId * 100, index: 0, windowId, pinned: false }]
        };
      },
      get: async () => currentWindow,
      getAll: async () => [currentWindow],
      remove: async () => {},
      update: async () => {}
    }
  };
  const imports = {
    "webextension-polyfill": { default: browser },
    "browser-info": { default: () => ({ name: "Chrome", version: 130 }) },
    loglevel: {
      default: { log() {}, warn() {}, error: (...args) => errors.push(args) }
    },
    "src/settings/settings": {
      getSettings: key => ({ ifSupportTst: false, tstDelay: 0, ...settings })[key] ?? false
    },
    "./replace.js": {
      returnReplaceURL: (state, title, url) => {
        assert.equal(state, "open_faild");
        return fallbackUrl(url);
      },
      replacePage: async windowId => events.push({ type: "replace", windowId })
    },
    "../common/tabGroups": { isEnabledTabGroups: false, updateTabGroups() {} },
    "./track.js": {
      isTrackingSession: () => false,
      setLastFocusedWindowId: async () => {},
      startTracking() {}
    }
  };
  const context = vm.createContext({
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    }
  });
  const filename = path.join(__dirname, "open.js");
  const module = new vm.SourceTextModule(await readFile(filename, "utf8"), {
    context,
    identifier: filename
  });
  await module.link(specifier => {
    assert.ok(Object.hasOwn(imports, specifier), `Unexpected import: ${specifier}`);
    const values = imports[specifier];
    return new vm.SyntheticModule(
      Object.keys(values),
      function () {
        for (const [name, value] of Object.entries(values)) this.setExport(name, value);
      },
      { context }
    );
  });
  await module.evaluate();
  return {
    openSession: module.namespace.openSession,
    events,
    pending,
    timers,
    calls,
    errors,
    get maxPending() {
      return maxPending;
    },
    async settle(error) {
      assert.equal(pending.length, 1, "Only one tabs.create should be pending");
      const { call, resolve, reject } = pending.shift();
      if (error) {
        events.push({ type: "failure", ...call, error });
        reject(error);
      } else {
        const tab = { ...call, id: nextTabId++ };
        events.push({ type: "success", ...tab });
        resolve(tab);
      }
      await flush();
    }
  };
}

for (const mode of ["openInNewWindow", "addToCurrentWindow", "openInCurrentWindow"]) {
  test(`${mode}: waits for 600 ordered tabs and sequential windows`, async () => {
    const mock = await loadOpen();
    let settled = false;
    const opening = mock.openSession(makeSession(3, 200), mode);
    opening.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );
    await flush();

    for (let count = 0; count < 600; count++) {
      assert.equal(settled, false, "openSession must not finish with pending tabs");
      assert.equal(mock.pending.length, 1, "Tabs must be opened sequentially");
      const win = Math.floor(count / 200);
      const index = count % 200;
      const windowId = mode === "openInNewWindow" ? 100 + win : win === 0 ? 1 : 99 + win;
      const offset = mode === "addToCurrentWindow" && win === 0 ? 1 : 0;
      assert.equal(mock.pending[0].call.windowId, windowId);
      assert.equal(mock.pending[0].call.index, index + offset);
      assert.equal(mock.pending[0].call.url, `https://example.test/${win}/${index}`);
      await mock.settle();
    }
    await opening;
    assert.equal(settled, true);
    assert.equal(mock.calls.length, 600);
    assert.equal(mock.maxPending, 1);
    assert.equal(mock.timers.length, 0, "No timers should be used without TST");
    assert.deepEqual(mock.errors, []);
    assert.deepEqual(
      mock.events
        .filter(event => event.type === "window")
        .map(event => [event.completed, event.pending]),
      mode === "openInNewWindow"
        ? [
            [0, 0],
            [200, 0],
            [400, 0]
          ]
        : [
            [200, 0],
            [400, 0]
          ]
    );
    const replacements = mock.events.filter(event => event.type === "replace");
    assert.equal(replacements.length, 3);
    for (const replacement of replacements) {
      const position = mock.events.indexOf(replacement);
      assert.equal(
        mock.events
          .slice(0, position)
          .filter(event => event.type === "success" && event.windowId === replacement.windowId)
          .length,
        200,
        "replacePage must run after all tabs in the window"
      );
    }
    const removals = mock.events.filter(event => event.type === "remove");
    assert.equal(removals.length, mode === "addToCurrentWindow" ? 2 : 3);
    for (const removal of removals) {
      const position = mock.events.indexOf(removal);
      assert.equal(
        mock.events[position - 1].type,
        "success",
        "Removes the initial tab after the first success"
      );
      assert.equal(mock.events[position - 1].index, 0);
      const windowId = mock.events[position - 1].windowId;
      assert.equal(removal.tabId, windowId === 1 ? 10 : windowId * 100);
    }
  });
}

test("Double failure logs the error, continues and calls replacePage even when the last tab fails", async () => {
  const mock = await loadOpen();
  const opening = mock.openSession(makeSession());
  await flush();
  const firstError = new Error("Initial failure");
  const firstFallbackError = new Error("First fallback failure");
  const lastError = new Error("Final failure");
  const lastFallbackError = new Error("Last fallback failure");
  await mock.settle(firstError);
  assert.equal(mock.pending[0].call.url, fallbackUrl("https://example.test/0/0"));
  await mock.settle(firstFallbackError);
  assert.equal(
    mock.events.some(event => event.type === "remove"),
    false
  );
  assert.equal(
    mock.events.some(event => event.type === "replace"),
    false
  );
  assert.equal(mock.pending[0].call.url, "https://example.test/0/1");
  await mock.settle();
  assert.deepEqual(
    mock.events.filter(event => event.type === "remove").map(event => event.tabId),
    [10000]
  );
  assert.equal(
    mock.events.some(event => event.type === "replace"),
    false
  );
  await mock.settle(lastError);
  await mock.settle(lastFallbackError);
  await opening;

  assert.deepEqual(
    mock.calls.map(call => call.index),
    [0, 0, 1, 2, 2]
  );
  assert.equal(mock.maxPending, 1);
  assert.equal(mock.pending.length, 0);
  assert.ok(
    mock.errors.some(args => args.includes(firstFallbackError)),
    "Logs the first double failure"
  );
  assert.ok(
    mock.errors.some(args => args.includes(lastFallbackError)),
    "Logs the last double failure"
  );
  assert.deepEqual(
    mock.events.slice(-2).map(event => event.type),
    ["failure", "replace"]
  );
  assert.equal(mock.events.filter(event => event.type === "replace").length, 1);
});

test("TST preserves the openerTabId from a successful fallback and uses controlled timers", async () => {
  const mock = await loadOpen({ ifSupportTst: true, tstDelay: 0 });
  const opening = mock.openSession(makeSession(1, 2));
  await flush();
  assert.equal(mock.pending.length, 0);
  assert.equal(mock.timers.length, 1);
  assert.equal(mock.timers[0].delay, 0);
  mock.timers.shift().callback();
  await mock.settle(new Error("Recoverable failure"));
  assert.equal(mock.pending[0].call.url, fallbackUrl("https://example.test/0/0"));
  await mock.settle();
  const parent = mock.events.find(event => event.type === "success");
  assert.equal(mock.pending.length, 0);
  assert.equal(mock.timers.length, 1);
  assert.equal(mock.timers[0].delay, 0);
  mock.timers.shift().callback();
  assert.equal(mock.pending[0].call.openerTabId, parent.id);
  await mock.settle();
  await opening;

  assert.deepEqual(
    mock.calls.map(call => call.index),
    [0, 0, 1]
  );
  assert.equal(mock.maxPending, 1);
  assert.equal(mock.timers.length, 0);
  assert.deepEqual(mock.errors, []);
  assert.equal(mock.events.filter(event => event.type === "remove").length, 1);
  assert.deepEqual(
    mock.events.slice(-2).map(event => event.type),
    ["success", "replace"]
  );
});
