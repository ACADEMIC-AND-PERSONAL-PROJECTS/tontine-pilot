import { describe, expect, it } from "vitest";
import { formatDate, formatFCFA, initials } from "../utils";

describe("formatFCFA", () => {
  it("formats French style by default", () => {
    expect(formatFCFA(20000)).toContain("20");
    expect(formatFCFA(20000)).toContain("FCFA");
  });
  it("formats US style in English", () => {
    expect(formatFCFA(20000, "en")).toBe("20,000 FCFA");
  });
});

describe("formatDate", () => {
  it("returns dash for empty input", () => {
    expect(formatDate("")).toBe("—");
  });
  it("differs between fr and en locales", () => {
    expect(formatDate("2024-09-01", "fr")).not.toBe(formatDate("2024-09-01", "en"));
  });
});

describe("initials", () => {
  it("takes first letters, uppercased", () => {
    expect(initials("Aïssatou Diallo")).toBe("AD");
  });
});
