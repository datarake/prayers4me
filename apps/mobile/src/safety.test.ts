import { describe, expect, it } from "vitest";
import { HELPLINE_URL, looksLikeCrisis } from "./safety";

describe("crisis detection", () => {
  it.each([
    ["English", "I feel so alone and I want to die."],
    ["English", "Sometimes I think about how to kill myself"],
    ["English", "I have been thinking about suicide"],
    ["Spanish", "A veces pienso en quitarme la vida"],
    ["Spanish", "ya no quiero vivir así"],
    ["French", "Je veux mourir, je n'en peux plus"],
    ["French", "j'ai envie de me tuer"],
    ["Romanian", "Mă gândesc să mă omor"],
    ["Romanian", "nu mai vreau să trăiesc"],
    ["Ukrainian", "Я хочу померти, мені дуже важко"],
    ["Ukrainian", "думаю про самогубство"],
    ["Russian", "Я хочу умереть, всё так тяжело"],
    ["Russian", "мысли о суициде не уходят"],
  ])("recognises %s: %s", (_language, text) => {
    expect(looksLikeCrisis(text)).toBe(true);
  });

  it("ignores case and extra spaces", () => {
    expect(looksLikeCrisis("I   WANT   TO   DIE")).toBe(true);
  });

  it.each([
    "Please pray for my exam tomorrow.",
    "My grandmother died last year and I miss her.",
    "Pray for my job interview, I am nervous.",
    "Моя мама в больнице, помолитесь за неё.",
    "Rugați-vă pentru sănătatea fiului meu.",
    "",
    "Hi",
  ])("does not flag %j", (text) => {
    expect(looksLikeCrisis(text)).toBe(false);
  });

  it("points to a helpline directory", () => {
    expect(HELPLINE_URL).toMatch(/^https:\/\//);
  });
});
