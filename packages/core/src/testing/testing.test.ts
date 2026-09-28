import { describe, expect, it } from "vitest";

import type { Scenario } from "../types/index.js";
import { pathFor } from "./index.js";

describe("pathFor", () => {
  it("monta o caminho relativo sem exigir persona", () => {
    const scenario: Scenario = {
      id: "requests.queue",
      title: "Fila",
      route: "/requests",
      fixture: "queue",
    };

    expect(pathFor(scenario)).toBe("/requests?scenario=requests.queue&fixture=queue");
  });

  it("inclui a persona quando o cenário declara uma", () => {
    const path = pathFor({
      id: "requests.queue",
      title: "Fila",
      route: "/requests",
      persona: "reviewer",
      fixture: "queue",
    });

    expect(new URL(path, "http://x.invalid").searchParams.get("persona")).toBe("reviewer");
  });
});
