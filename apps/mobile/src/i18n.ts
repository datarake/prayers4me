import type { LanguageCode } from "@prayers4me/shared";
import { extraDictionaries } from "./i18n.extra";

type Dictionary = {
  languageButton: string;
  tagline: string;
  about: string;
  forOthersAction: string;
  forOthersActionHint: string;
  forMeAction: string;
  forMeActionHint: string;
  languagesTitle: string;
  forOthersTitle: string;
  forOthersIntro: string;
  forMeTitle: string;
  forMeIntro: string;
  pray: string;
  prayed: string;
  report: string;
  emptyFeedTitle: string;
  emptyFeedBody: string;
  emptyMineTitle: string;
  emptyMineBody: string;
  composeTitle: string;
  composeIntro: string;
  nameLabel: string;
  messageLabel: string;
  contactLabel: string;
  phoneLabel: string;
  emailLabel: string;
  send: string;
  prayersNone: string;
  prayersOne: string;
  prayersMany: (n: number) => string;
  loading: string;
  errorGeneric: string;
  back: string;
};

const dictionaries: Record<LanguageCode, Dictionary> = {
  en: {
    languageButton: "Prayers in English",
    tagline: "Someone prayed for you.",
    about: "Share what weighs on you. People will pray for you, quietly and anonymously. Even one prayer can be enough.",
    forOthersAction: "Pray for someone",
    forOthersActionHint: "Read a request and pray quietly",
    forMeAction: "Ask for prayer",
    forMeActionHint: "Share your story and let others pray for you",
    languagesTitle: "Language",
    forOthersTitle: "Pray for someone",
    forOthersIntro: "Pray for each person, then tap “I prayed”. They will see how many people prayed, never who.",
    forMeTitle: "My requests",
    forMeIntro: "When someone prays for you, the number grows here.",
    pray: "I prayed",
    prayed: "You prayed",
    report: "Report",
    emptyFeedTitle: "No requests yet",
    emptyFeedBody: "New requests in this language will appear here.",
    emptyMineTitle: "No requests yet",
    emptyMineBody: "Share a few words about what feels heavy. You do not have to explain everything.",
    composeTitle: "Ask for prayer",
    composeIntro: "Write in your own words. Please do not paste long texts.",
    nameLabel: "Your name",
    messageLabel: "What would you like prayer for?",
    contactLabel: "Add contact details",
    phoneLabel: "Phone",
    emailLabel: "Email",
    send: "Send request",
    prayersNone: "Waiting for the first prayer",
    prayersOne: "1 person prayed",
    prayersMany: (n) => `${n} people prayed`,
    loading: "Loading…",
    errorGeneric: "Something went wrong",
    back: "Back",
  },
  es: {
    languageButton: "Oraciones en español",
    tagline: "Alguien oró por ti.",
    about: "Comparte lo que te pesa. Otras personas orarán por ti, en silencio y de forma anónima. Una sola oración puede bastar.",
    forOthersAction: "Orar por alguien",
    forOthersActionHint: "Lee una petición y ora en silencio",
    forMeAction: "Pedir oración",
    forMeActionHint: "Comparte tu historia y deja que otros oren por ti",
    languagesTitle: "Idioma",
    forOthersTitle: "Orar por alguien",
    forOthersIntro: "Ora por cada persona y toca “Oré”. Verá cuántas personas oraron, nunca quiénes.",
    forMeTitle: "Mis peticiones",
    forMeIntro: "Cuando alguien ore por ti, el número crecerá aquí.",
    pray: "Oré",
    prayed: "Ya oraste",
    report: "Reportar",
    emptyFeedTitle: "Aún no hay peticiones",
    emptyFeedBody: "Las nuevas peticiones en este idioma aparecerán aquí.",
    emptyMineTitle: "Aún no hay peticiones",
    emptyMineBody: "Escribe unas palabras sobre lo que te pesa. No hace falta explicarlo todo.",
    composeTitle: "Pedir oración",
    composeIntro: "Escribe con tus propias palabras. Por favor, no pegues textos largos.",
    nameLabel: "Tu nombre",
    messageLabel: "¿Por qué te gustaría pedir oración?",
    contactLabel: "Añadir datos de contacto",
    phoneLabel: "Teléfono",
    emailLabel: "Correo",
    send: "Enviar petición",
    prayersNone: "Esperando la primera oración",
    prayersOne: "1 persona oró",
    prayersMany: (n) => `${n} personas oraron`,
    loading: "Cargando…",
    errorGeneric: "Algo salió mal",
    back: "Atrás",
  },
  fr: {
    languageButton: "Prières en français",
    tagline: "Quelqu’un a prié pour toi.",
    about: "Partage ce qui te pèse. D’autres prieront pour toi, en silence et anonymement. Une seule prière peut suffire.",
    forOthersAction: "Prier pour quelqu’un",
    forOthersActionHint: "Lis une demande et prie en silence",
    forMeAction: "Demander une prière",
    forMeActionHint: "Partage ton histoire et laisse d’autres prier pour toi",
    languagesTitle: "Langue",
    forOthersTitle: "Prier pour quelqu’un",
    forOthersIntro: "Prie pour chaque personne, puis touche « J’ai prié ». Elle verra combien de personnes ont prié, jamais qui.",
    forMeTitle: "Mes demandes",
    forMeIntro: "Quand quelqu’un prie pour toi, le nombre augmente ici.",
    pray: "J’ai prié",
    prayed: "Tu as prié",
    report: "Signaler",
    emptyFeedTitle: "Aucune demande",
    emptyFeedBody: "Les nouvelles demandes dans cette langue apparaîtront ici.",
    emptyMineTitle: "Aucune demande",
    emptyMineBody: "Écris quelques mots sur ce qui te pèse. Pas besoin de tout expliquer.",
    composeTitle: "Demander une prière",
    composeIntro: "Écris avec tes propres mots. Merci de ne pas coller de longs textes.",
    nameLabel: "Ton prénom",
    messageLabel: "Pour quoi souhaites-tu une prière ?",
    contactLabel: "Ajouter des coordonnées",
    phoneLabel: "Téléphone",
    emailLabel: "E-mail",
    send: "Envoyer la demande",
    prayersNone: "En attente de la première prière",
    prayersOne: "1 personne a prié",
    prayersMany: (n) => `${n} personnes ont prié`,
    loading: "Chargement…",
    errorGeneric: "Une erreur s’est produite",
    back: "Retour",
  },
  ro: {
    languageButton: "Rugăciuni în română",
    tagline: "Cineva s-a rugat pentru tine.",
    about: "Spune ce te apasă. Alții se vor ruga pentru tine, în liniște și anonim. Chiar și o singură rugăciune poate fi de ajuns.",
    forOthersAction: "Roagă-te pentru cineva",
    forOthersActionHint: "Citește o cerere și roagă-te în liniște",
    forMeAction: "Cere o rugăciune",
    forMeActionHint: "Spune-ți povestea și lasă-i pe alții să se roage pentru tine",
    languagesTitle: "Limbă",
    forOthersTitle: "Roagă-te pentru cineva",
    forOthersIntro: "Roagă-te pentru fiecare persoană, apoi atinge „M-am rugat”. Va vedea câți oameni s-au rugat, niciodată cine.",
    forMeTitle: "Cererile mele",
    forMeIntro: "Când cineva se roagă pentru tine, numărul crește aici.",
    pray: "M-am rugat",
    prayed: "Te-ai rugat",
    report: "Raportează",
    emptyFeedTitle: "Nicio cerere încă",
    emptyFeedBody: "Cererile noi în această limbă vor apărea aici.",
    emptyMineTitle: "Nicio cerere încă",
    emptyMineBody: "Scrie câteva cuvinte despre ce te apasă. Nu trebuie să explici totul.",
    composeTitle: "Cere o rugăciune",
    composeIntro: "Scrie cu cuvintele tale. Te rugăm să nu lipești texte lungi.",
    nameLabel: "Numele tău",
    messageLabel: "Pentru ce ai vrea o rugăciune?",
    contactLabel: "Adaugă date de contact",
    phoneLabel: "Telefon",
    emailLabel: "E-mail",
    send: "Trimite cererea",
    prayersNone: "Se așteaptă prima rugăciune",
    prayersOne: "1 persoană s-a rugat",
    prayersMany: (n) => `${n} persoane s-au rugat`,
    loading: "Se încarcă…",
    errorGeneric: "Ceva nu a mers bine",
    back: "Înapoi",
  },
  uk: {
    languageButton: "Молитви українською",
    tagline: "Хтось помолився за тебе.",
    about: "Поділися тим, що тебе гнітить. Інші помоляться за тебе тихо й анонімно. Навіть однієї молитви може бути досить.",
    forOthersAction: "Помолитися за когось",
    forOthersActionHint: "Прочитай прохання й помолись у тиші",
    forMeAction: "Попросити молитви",
    forMeActionHint: "Поділися історією, і за тебе помоляться",
    languagesTitle: "Мова",
    forOthersTitle: "Помолитися за когось",
    forOthersIntro: "Помолися за кожну людину й торкнися «Я молюся». Вона побачить, скільки людей молилося, але не хто.",
    forMeTitle: "Мої прохання",
    forMeIntro: "Коли хтось помолиться за тебе, число зросте тут.",
    pray: "Я молюся",
    prayed: "Молитву надіслано",
    report: "Поскаржитися",
    emptyFeedTitle: "Поки немає прохань",
    emptyFeedBody: "Нові прохання цією мовою зʼявляться тут.",
    emptyMineTitle: "Прохань поки немає",
    emptyMineBody: "Напиши кілька слів про те, що тебе гнітить. Не треба пояснювати все.",
    composeTitle: "Попросити молитви",
    composeIntro: "Пиши своїми словами. Будь ласка, не вставляй довгі тексти.",
    nameLabel: "Твоє імʼя",
    messageLabel: "Про що ти хочеш попросити молитви?",
    contactLabel: "Додати контактні дані",
    phoneLabel: "Телефон",
    emailLabel: "Ел. пошта",
    send: "Надіслати прохання",
    prayersNone: "Чекаємо на першу молитву",
    prayersOne: "Молилася 1 людина",
    prayersMany: (n) => `Молилися: ${n}`,
    loading: "Завантаження…",
    errorGeneric: "Щось пішло не так",
    back: "Назад",
  },
  ru: {
    languageButton: "Молитвы на русском языке",
    tagline: "Кто-то помолился за тебя.",
    about: "Поделись тем, что тебя тяготит. Другие помолятся за тебя тихо и анонимно. Даже одной молитвы может быть достаточно.",
    forOthersAction: "Помолиться за кого-то",
    forOthersActionHint: "Прочитай просьбу и помолись в тишине",
    forMeAction: "Попросить молитвы",
    forMeActionHint: "Поделись историей, и за тебя помолятся",
    languagesTitle: "Язык",
    forOthersTitle: "Помолиться за кого-то",
    forOthersIntro: "Помолись за каждого человека и нажми «Я молюсь». Он увидит, сколько людей молились, но не кто.",
    forMeTitle: "Мои просьбы",
    forMeIntro: "Когда кто-то помолится за тебя, число вырастет здесь.",
    pray: "Я молюсь",
    prayed: "Молитва отправлена",
    report: "Пожаловаться",
    emptyFeedTitle: "Пока нет просьб",
    emptyFeedBody: "Новые просьбы на этом языке появятся здесь.",
    emptyMineTitle: "Просьб пока нет",
    emptyMineBody: "Напиши несколько слов о том, что тебя тяготит. Объяснять всё не нужно.",
    composeTitle: "Попросить молитвы",
    composeIntro: "Пиши своими словами. Пожалуйста, не вставляй длинные тексты.",
    nameLabel: "Твоё имя",
    messageLabel: "О чём ты хочешь попросить молитвы?",
    contactLabel: "Добавить контактные данные",
    phoneLabel: "Телефон",
    emailLabel: "Эл. почта",
    send: "Отправить просьбу",
    prayersNone: "Ждём первую молитву",
    prayersOne: "Молился 1 человек",
    prayersMany: (n) => `Молились: ${n}`,
    loading: "Загрузка…",
    errorGeneric: "Что-то пошло не так",
    back: "Назад",
  },
};

export type Copy = Dictionary & (typeof extraDictionaries)["en"];

const merged = Object.fromEntries(
  (Object.keys(dictionaries) as LanguageCode[]).map((code) => [
    code,
    { ...dictionaries[code], ...extraDictionaries[code] },
  ]),
) as Record<LanguageCode, Copy>;

export function t(language: LanguageCode): Copy {
  return merged[language];
}

export function prayersLabel(language: LanguageCode, count: number): string {
  const d = t(language);
  if (count <= 0) return d.prayersNone;
  if (count === 1) return d.prayersOne;
  return d.prayersMany(count);
}
