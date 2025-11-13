const GRID_SELECTOR = ".detailsContainer.gridView .windowContainer .tabs";
const SINGLE_COLUMN_CLASS = "isSingleColumn";
const COPY_FEEDBACK_CLASS = "isCopyFeedback";
const COPY_FEEDBACK_DURATION = 900;

let resizeObserver = null;
let mutationObserver = null;
let copyListener = null;
let observedGrids = new WeakSet();
let copyFeedbackTimers = new WeakMap();
let copyLabelCache = null;

function getColumnCount(grid) {
  const template = getComputedStyle(grid).gridTemplateColumns.trim();
  if (!template || template === "none") {
    return 0;
  }

  let depth = 0;
  let buffer = "";
  let count = 0;
  for (const char of template) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(depth - 1, 0);
    }

    if (/\s/.test(char) && depth === 0) {
      if (buffer.trim()) {
        count += 1;
        buffer = "";
      }
    } else {
      buffer += char;
    }
  }

  if (buffer.trim()) {
    count += 1;
  }
  return count;
}

function updateGrid(grid) {
  grid.classList.toggle(SINGLE_COLUMN_CLASS, getColumnCount(grid) <= 1);
}

function monitorGrids() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(GRID_SELECTOR).forEach(grid => {
    if (observedGrids.has(grid)) {
      updateGrid(grid);
      return;
    }
    observedGrids.add(grid);
    updateGrid(grid);
    if (resizeObserver) {
      resizeObserver.observe(grid);
    }
  });
}

function normalizeLabel(value) {
  return (value || "").trim().toLowerCase();
}

function getCopyLabel() {
  if (copyLabelCache !== null) {
    return copyLabelCache;
  }
  const api = (globalThis.browser && globalThis.browser.i18n) || (globalThis.chrome && globalThis.chrome.i18n);
  let label = "";
  if (api && typeof api.getMessage === "function") {
    try {
      label = api.getMessage("copyUrlLabel") || "";
    } catch (error) {
      // ignore
    }
  }
  copyLabelCache = normalizeLabel(label) || normalizeLabel("Copy URL");
  return copyLabelCache;
}

function isCopyButton(element) {
  if (!element) {
    return false;
  }
  const label = getCopyLabel();
  if (!label) {
    return false;
  }
  return normalizeLabel(element.getAttribute("title")) === label ||
    normalizeLabel(element.getAttribute("aria-label")) === label;
}

function showCopyFeedback(button) {
  button.classList.add(COPY_FEEDBACK_CLASS);
  if (typeof button.blur === "function") {
    button.blur();
  }
  if (copyFeedbackTimers.has(button)) {
    clearTimeout(copyFeedbackTimers.get(button));
  }
  const timeoutId = setTimeout(() => {
    button.classList.remove(COPY_FEEDBACK_CLASS);
    copyFeedbackTimers.delete(button);
  }, COPY_FEEDBACK_DURATION);
  copyFeedbackTimers.set(button, timeoutId);
}

function attachCopyFeedbackListener() {
  copyListener = event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".thumbnailAction");
    if (!button || !isCopyButton(button)) return;
    showCopyFeedback(button);
  };
  document.addEventListener("click", copyListener);
}

export function initToolbarLayout() {
  if (typeof document === "undefined") return;
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => updateGrid(entry.target));
    });
  }
  if (!mutationObserver) {
    mutationObserver = new MutationObserver(() => monitorGrids());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (!copyListener) {
    attachCopyFeedbackListener();
  }
  monitorGrids();
}

export function disposeToolbarLayout() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (copyListener) {
    document.removeEventListener("click", copyListener);
    copyListener = null;
  }
  observedGrids = new WeakSet();
  copyFeedbackTimers = new WeakMap();
  copyLabelCache = null;
}
