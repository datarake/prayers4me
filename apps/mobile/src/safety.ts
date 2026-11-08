/**
 * Detects wording that suggests the writer may be thinking about self-harm, in any of
 * the app's languages. It only decides whether to show a supportive card. It never
 * blocks sending, never stores anything, and never leaves the device.
 */
const PHRASES: string[] = [
  // English
  "suicid", "kill myself", "end my life", "end it all", "want to die", "wanna die",
  "hurt myself", "harm myself", "better off dead", "take my own life",
  // Spanish
  "suicid", "quitarme la vida", "quiero morir", "no quiero vivir", "hacerme daño",
  "acabar con mi vida",
  // French
  "me tuer", "mettre fin à mes jours", "veux mourir", "veux plus vivre",
  "me faire du mal", "en finir avec la vie",
  // Romanian
  "sinucid", "să mor", "sa mor", "mă omor", "ma omor", "nu mai vreau să trăiesc",
  "nu mai vreau sa traiesc", "să-mi fac rău", "sa-mi fac rau",
  // Ukrainian
  "самогубств", "хочу померти", "вбити себе", "покінчити з собою", "не хочу жити",
  "зробити собі боляче",
  // Russian
  "суицид", "самоубийств", "хочу умереть", "убить себя", "покончить с собой",
  "не хочу жить", "причинить себе вред",
];

export function looksLikeCrisis(text: string): boolean {
  if (text.length < 6) return false;
  const t = text.toLowerCase().replace(/\s+/g, " ");
  return PHRASES.some((p) => t.includes(p));
}

/** Helpline directory that covers most countries and languages. */
export const HELPLINE_URL = "https://findahelpline.com";
