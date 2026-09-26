import { describe, expect, it } from "vitest";
import { routeMemberEmail } from "../../amplify/functions/_shared/intent";

describe("routeMemberEmail", () => {
  it("routes French reminders with à + name", () => {
    expect(routeMemberEmail("Envoie un rappel à Test User, il est en retard", "fr")).toEqual({
      kind: "reminder",
      recipient: "Test User",
    });
  });
  it("routes French messages (demande à X de verser)", () => {
    expect(
      routeMemberEmail("demande à Cheikh de verser tout de suite, la date a avancé", "fr")
    ).toEqual({ kind: "message", recipient: "Cheikh" });
  });
  it("routes English reminders", () => {
    expect(routeMemberEmail("Remind Ibrahima he is late on payment", "en")).toEqual({
      kind: "reminder",
      recipient: "Ibrahima",
    });
  });
  it("extracts emails directly", () => {
    expect(routeMemberEmail("send a message to awa@exemple.sn please", "en")).toEqual({
      kind: "message",
      recipient: "awa@exemple.sn",
    });
  });
  it("returns null without intent or recipient", () => {
    expect(routeMemberEmail("comment déclarer ?", "fr")).toBeNull();
    expect(routeMemberEmail("remind them please", "en")).toBeNull();
  });
});
