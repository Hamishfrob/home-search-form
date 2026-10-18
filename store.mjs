// Keeps her answers on her own phone so she can stop halfway and come back.
// Storage can be missing or blocked (a private window, strict settings), so
// every read and write is guarded and the form carries on without it.

const KEY = "ps-answers-v1";

export function makeStore(storage) {
  let ok = Boolean(storage);
  return {
    get ok() { return ok; },
    load() {
      if (!storage) { ok = false; return {}; }
      try {
        const text = storage.getItem(KEY);
        return text ? JSON.parse(text) : {};
      } catch {
        // Unreadable saved text is not worth stopping for. Blocked storage is
        // not worth hiding either, but a parse failure alone leaves it usable.
        try { storage.getItem(KEY); } catch { ok = false; }
        return {};
      }
    },
    save(state) {
      if (!storage) { ok = false; return; }
      try {
        storage.setItem(KEY, JSON.stringify(state));
        ok = true;
      } catch {
        ok = false;
      }
    },
  };
}

/** The browser's localStorage, or undefined when even touching it throws. */
export function browserStorage() {
  try { return window.localStorage; } catch { return undefined; }
}
