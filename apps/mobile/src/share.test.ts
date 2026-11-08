import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Share: { share: vi.fn(), sharedAction: "sharedAction" } }));

import { SHARE_URL, shareContent } from "./share";

describe("sharing the app", () => {
  it("points to the Stillflame website by default", () => {
    expect(SHARE_URL).toBe("https://stillflame.app");
  });

  it("puts the link on its own line under the message", () => {
    expect(shareContent("Hello", "https://stillflame.app")).toEqual({
      message: "Hello\nhttps://stillflame.app",
    });
  });

  it("sends the message alone when the link is switched off", () => {
    expect(shareContent("Hello", "")).toEqual({ message: "Hello" });
  });

  it("only ever carries the message and the link, never anything else", () => {
    expect(Object.keys(shareContent("Hello"))).toEqual(["message"]);
  });
});
