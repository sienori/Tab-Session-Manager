const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const getURL = file => `chrome-extension://restore-test/${file}`;
const placeholder = state =>
  getURL(`replaced/index.html?state=${state}&url=https%3A%2F%2Fexample.com%2F&title=Example`);

async function load(file, mocks, globals = {}) {
  const context = vm.createContext({ setTimeout, ...globals });
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const module = new vm.SourceTextModule(source, { context });
  await module.link(specifier => {
    const exports = mocks[specifier];
    assert.ok(exports, `Unexpected import: ${specifier}`);
    return new vm.SyntheticModule(
      Object.keys(exports),
      function () {
        for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
      },
      { context }
    );
  });
  await module.evaluate();
  return module.namespace;
}

async function fixture(name = "Chrome") {
  const tab = { id: 12, active: true, status: "complete", url: placeholder("open_faild") };
  const updates = [];
  const delays = [];
  const browser = {
    runtime: { getURL },
    windows: { WINDOW_ID_CURRENT: -2 },
    tabs: {
      get: async () => ({ ...tab }),
      query: async () => {
        throw new Error("Unexpected window query");
      },
      update: async (...args) => {
        updates.push(args);
      }
    }
  };
  const { replacePage } = await load(
    "background/replace.js",
    {
      "webextension-polyfill": { default: browser },
      "browser-info": { default: () => ({ name, version: "156" }) },
      loglevel: { default: { info() {}, warn() {} } },
      "../settings/settings": { getSettings: () => "light" }
    },
    {
      setTimeout: (callback, delay) => {
        delays.push(delay);
        queueMicrotask(callback);
      }
    }
  );
  return { tab, updates, delays, browser, restore: () => replacePage(34, 12) };
}

test("restores the requested active placeholder, not another window's tab", async () => {
  const f = await fixture();
  await f.restore();
  assert.equal(f.updates[0][0], 12);
  assert.equal(f.updates[0][1].url, "https://example.com/");
});

test("ignores inactive, unloaded, loading, normal and invalid placeholder tabs", async () => {
  for (const change of [
    { active: false },
    { status: "unloaded" },
    { status: "loading" },
    { url: undefined },
    { url: "https://example.com/" },
    { url: "https://example.com/#" + placeholder("open_faild") },
    { url: getURL("replaced/index.html") }
  ]) {
    const f = await fixture();
    Object.assign(f.tab, change);
    await f.restore();
    assert.equal(f.updates.length, 0);
    assert.equal(f.delays.length, 0);
  }
});

test("combines concurrent restoration signals in the background", async () => {
  const f = await fixture();
  let finish;
  f.browser.tabs.update = (...args) => {
    f.updates.push(args);
    return new Promise(resolve => {
      finish = resolve;
    });
  };
  const first = f.restore();
  await new Promise(resolve => setImmediate(resolve));
  await f.restore();
  assert.equal(f.updates.length, 1);
  finish();
  await first;
});

test("retries transient errors, but never exceeds three attempts", async () => {
  for (const failures of [1, 3]) {
    const f = await fixture();
    f.browser.tabs.update = async (...args) => {
      f.updates.push(args);
      if (f.updates.length <= failures) throw new Error("Tabs cannot be edited right now");
    };
    await f.restore();
    assert.equal(f.updates.length, Math.min(failures + 1, 3));
    assert.deepEqual(f.delays, failures === 1 ? [100] : [100, 100]);
  }
});

test("stops retrying if the tab becomes inactive or navigates elsewhere", async () => {
  for (const change of [{ active: false }, { url: "https://other.example/" }]) {
    const f = await fixture();
    f.browser.tabs.update = async (...args) => {
      f.updates.push(args);
      Object.assign(f.tab, change);
      throw new Error("Tabs cannot be edited right now");
    };
    await f.restore();
    assert.equal(f.updates.length, 1);
  }
});

test("preserves failed placeholders and Firefox history replacement on fallback", async () => {
  for (const state of ["open_faild", "redirect"]) {
    const f = await fixture("Firefox");
    f.tab.url = placeholder(state);
    f.browser.tabs.update = async (...args) => {
      f.updates.push(args);
      if (f.updates.length === 1) throw new Error("URL is not allowed");
    };
    await f.restore();
    assert.equal(f.updates.length, state === "open_faild" ? 1 : 2);
    assert.ok(f.updates.every(([, properties]) => properties.loadReplace === true));
    assert.equal(f.delays.length, 0);
  }
});

test("requests restoration on visible load and when a hidden successor becomes visible", async () => {
  for (const initial of ["hidden", "visible"]) {
    const requests = [];
    let visibilityChange;
    const document = {
      visibilityState: initial,
      getElementsByClassName: () => [{}],
      querySelector: () => ({}),
      head: { insertAdjacentHTML() {} },
      body: { classList: { add() {} } },
      addEventListener: (name, listener) => {
        visibilityChange = listener;
      }
    };
    await load(
      "replaced/replaced.js",
      {
        "webextension-polyfill": {
          default: {
            runtime: {
              sendMessage: async request => {
                requests.push(request.message);
              }
            },
            i18n: { getMessage: () => "" }
          }
        },
        loglevel: { default: { warn() {} } },
        "./replaced.scss": {}
      },
      { document, location: { href: placeholder("open_faild") } }
    );
    assert.deepEqual(requests, initial === "visible" ? ["replacePage"] : []);
    document.visibilityState = "hidden";
    await visibilityChange();
    document.visibilityState = "visible";
    await visibilityChange();
    assert.equal(requests.length, initial === "visible" ? 2 : 1);
  }
});
