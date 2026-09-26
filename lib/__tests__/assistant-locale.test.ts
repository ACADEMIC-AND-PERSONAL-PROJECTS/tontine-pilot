import { describe, expect, it } from "vitest";
import { detectLocale } from "../../amplify/functions/_shared/locale";

describe("detectLocale", () => {
  it("detects French by accents and stopwords", () => {
    expect(detectLocale("comment utiliser cette plateforme ?", "en")).toBe("fr");
    expect(detectLocale("C'est quoi cette plateforme ?", "en")).toBe("fr");
  });
  it("detects English", () => {
    expect(detectLocale("How do I declare a contribution?", "fr")).toBe("en");
    expect(detectLocale("What is the emergency fund?", "fr")).toBe("en");
  });
  it("falls back to UI locale when ambiguous", () => {
    expect(detectLocale("Cheikh 20000", "fr")).toBe("fr");
    expect(detectLocale("Cheikh 20000", "en")).toBe("en");
  });
});
