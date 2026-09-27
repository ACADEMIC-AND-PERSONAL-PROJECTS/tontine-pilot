import { describe, expect, it } from "vitest";
import { isAlreadyConfirmedError, passwordScore } from "../auth-errors";

describe("isAlreadyConfirmedError", () => {
  it("detects retries on confirmed accounts", () => {
    const e = { name: "NotAuthorizedException", message: "User cannot be confirmed. Current status is CONFIRMED" };
    expect(isAlreadyConfirmedError(e)).toBe(true);
  });
  it("rejects other failures", () => {
    expect(isAlreadyConfirmedError({ name: "CodeMismatchException", message: "Invalid code" })).toBe(false);
    expect(isAlreadyConfirmedError({ name: "ExpiredCodeException", message: "Invalid code provided" })).toBe(false);
    expect(isAlreadyConfirmedError({ name: "NotAuthorizedException", message: "Incorrect username or password." })).toBe(false);
    expect(isAlreadyConfirmedError(null)).toBe(false);
  });
});

describe("passwordScore", () => {
  it("scores length, digits, lowercase", () => {
    expect(passwordScore("Test1234!")).toBeGreaterThanOrEqual(3);
    expect(passwordScore("abc")).toBeLessThan(3);
  });
});
