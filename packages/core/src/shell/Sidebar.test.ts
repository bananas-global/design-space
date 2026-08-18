import { describe, expect, it } from "vitest";

import { isSearchShortcut, nextItemId } from "./Sidebar.js";

describe("atalhos da navegação", () => {
  it("abre a busca com Command/Ctrl + K ou F", () => {
    const event = (key: string, metaKey = true) => ({
      key,
      metaKey,
      ctrlKey: !metaKey,
      altKey: false,
      shiftKey: false,
    });

    expect(isSearchShortcut(event("k"))).toBe(true);
    expect(isSearchShortcut(event("F", false))).toBe(true);
    expect(isSearchShortcut({ ...event("k"), shiftKey: true })).toBe(false);
  });

  it("navega resultados com setas sem ultrapassar a lista", () => {
    const ids = ["requests.queue", "requests.empty", "requests.approve"];
    expect(nextItemId(ids, undefined, 1)).toBe("requests.queue");
    expect(nextItemId(ids, "requests.queue", 1)).toBe("requests.empty");
    expect(nextItemId(ids, "requests.empty", -1)).toBe("requests.queue");
    expect(nextItemId(ids, "requests.approve", 1)).toBe("requests.approve");
  });
});
