import { describe, expect, it } from "vitest";
import { ageInYears, daysBetween, parseIsoDate } from "./date.js";

describe("parseIsoDate", () => {
  it("lê data sem horário como local, não como UTC", () => {
    const date = parseIsoDate("2026-07-30");
    // O bug original: com parse UTC, em fuso negativo `getDate()` devolvia 29.
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(30);
  });

  it("preserva o instante quando o horário e o deslocamento vêm na string", () => {
    expect(parseIsoDate("2026-07-30T12:00:00Z").toISOString()).toBe("2026-07-30T12:00:00.000Z");
  });
});

describe("ageInYears", () => {
  it("conta apenas anos completos", () => {
    expect(ageInYears("1988-04-12", "2026-07-30")).toBe(38);
    expect(ageInYears("1988-08-12", "2026-07-30")).toBe(37);
  });

  it("acerta a fronteira do aniversário", () => {
    expect(ageInYears("2008-07-30", "2026-07-30")).toBe(18);
    expect(ageInYears("2008-07-31", "2026-07-30")).toBe(17);
  });

  it("não desloca por causa do fuso", () => {
    // Nascimento em 08/09: com parse UTC, o dia virava 07 e a fronteira do
    // aniversário andava um dia.
    expect(ageInYears("2011-09-08", "2026-09-08")).toBe(15);
    expect(ageInYears("2011-09-08", "2026-09-07")).toBe(14);
  });
});

describe("daysBetween", () => {
  it("conta dias completos", () => {
    expect(daysBetween("2026-06-13", "2026-07-30")).toBe(47);
    expect(daysBetween("2026-07-30", "2026-07-30")).toBe(0);
  });

  it("é negativo quando a ordem inverte", () => {
    expect(daysBetween("2026-07-30", "2026-07-18")).toBe(-12);
  });
});
