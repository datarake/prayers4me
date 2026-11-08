import type { LanguageCode } from "@prayers4me/shared";

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
    about:
      "Share what weighs on you. Others can pray for you — quietly, anonymously. Even one prayer can be enough.",
    forOthersAction: "Pray for someone",
    forOthersActionHint: "Read a request and leave a quiet prayer",
    forMeAction: "Ask for prayer",
    forMeActionHint: "Tell your story. People will pray for you",
    languagesTitle: "Language",
    forOthersTitle: "Pray for someone",
    forOthersIntro:
      "Each story is a person asking for prayer. Tap Pray when you have held them in your thoughts. They will see the count — not your name.",
    forMeTitle: "Prayers for me",
    forMeIntro:
      "Your requests stay here. When someone prays, the number grows. Even one can steady you.",
    pray: "I prayed",
    prayed: "You prayed",
    report: "Report",
    emptyFeedTitle: "No one is asking yet",
    emptyFeedBody:
      "When someone shares a hard moment in this language, it will appear here for you to pray.",
    emptyMineTitle: "You have not asked yet",
    emptyMineBody:
      "If something feels heavy, write a few words. You do not need to explain everything.",
    composeTitle: "Ask for prayer",
    composeIntro:
      "Write from the heart. Keep it personal — this is not a place for long copied texts.",
    nameLabel: "How should we call you?",
    messageLabel: "What is on your heart?",
    contactLabel: "I want to be contacted",
    phoneLabel: "Phone",
    emailLabel: "Email",
    send: "Send my request",
    prayersNone: "Waiting for a first prayer",
    prayersOne: "Someone has prayed",
    prayersMany: (n) => `${n} people have prayed`,
    loading: "Loading…",
    errorGeneric: "Something went wrong. Please try again.",
    back: "Back",
  },
  es: {
    languageButton: "Oraciones en español",
    tagline: "Alguien oró por ti.",
    about:
      "Comparte lo que te pesa. Otros pueden orar por ti en silencio y de forma anónima. Incluso una oración puede bastar.",
    forOthersAction: "Orar por alguien",
    forOthersActionHint: "Lee una petición y deja una oración silenciosa",
    forMeAction: "Pedir oración",
    forMeActionHint: "Cuenta tu historia. Orarán por ti",
    languagesTitle: "Idioma",
    forOthersTitle: "Orar por alguien",
    forOthersIntro:
      "Cada historia es una persona pidiendo oración. Toca Orar cuando la hayas tenido en tus pensamientos. Verán el número, no tu nombre.",
    forMeTitle: "Oraciones por mí",
    forMeIntro:
      "Tus peticiones están aquí. Cuando alguien ora, el número crece. Incluso una puede sostenerte.",
    pray: "Oré",
    prayed: "Ya oraste",
    report: "Reportar",
    emptyFeedTitle: "Aún no hay peticiones",
    emptyFeedBody:
      "Cuando alguien comparta un momento difícil en este idioma, aparecerá aquí.",
    emptyMineTitle: "Aún no has pedido",
    emptyMineBody:
      "Si algo te pesa, escribe unas palabras. No hace falta explicarlo todo.",
    composeTitle: "Pedir oración",
    composeIntro:
      "Escribe desde el corazón. Sé personal — no es un lugar para textos largos copiados.",
    nameLabel: "¿Cómo te llamamos?",
    messageLabel: "¿Qué hay en tu corazón?",
    contactLabel: "Quiero que me contacten",
    phoneLabel: "Teléfono",
    emailLabel: "Correo",
    send: "Enviar mi petición",
    prayersNone: "Esperando la primera oración",
    prayersOne: "Alguien ha orado",
    prayersMany: (n) => `${n} personas han orado`,
    loading: "Cargando…",
    errorGeneric: "Algo salió mal. Inténtalo de nuevo.",
    back: "Atrás",
  },
  fr: {
    languageButton: "Prières en français",
    tagline: "Quelqu’un a prié pour toi.",
    about:
      "Partage ce qui te pèse. D’autres peuvent prier pour toi, en silence et anonymement. Même une seule prière peut suffire.",
    forOthersAction: "Prier pour quelqu’un",
    forOthersActionHint: "Lis une demande et laisse une prière discrète",
    forMeAction: "Demander une prière",
    forMeActionHint: "Raconte ton histoire. On priera pour toi",
    languagesTitle: "Langue",
    forOthersTitle: "Prier pour quelqu’un",
    forOthersIntro:
      "Chaque histoire est une personne qui demande une prière. Touche Prier quand tu l’as portée dans ta pensée. Ils verront le nombre, pas ton nom.",
    forMeTitle: "Prières pour moi",
    forMeIntro:
      "Tes demandes restent ici. Quand quelqu’un prie, le nombre grandit. Même une seule peut te soutenir.",
    pray: "J’ai prié",
    prayed: "Tu as prié",
    report: "Signaler",
    emptyFeedTitle: "Aucune demande pour l’instant",
    emptyFeedBody:
      "Quand quelqu’un partagera un moment difficile dans cette langue, il apparaîtra ici.",
    emptyMineTitle: "Tu n’as pas encore demandé",
    emptyMineBody:
      "Si quelque chose est lourd, écris quelques mots. Tu n’as pas besoin de tout expliquer.",
    composeTitle: "Demander une prière",
    composeIntro:
      "Écris avec le cœur. Reste personnel — ce n’est pas un lieu pour de longs textes copiés.",
    nameLabel: "Comment t’appeler ?",
    messageLabel: "Qu’y a-t-il sur ton cœur ?",
    contactLabel: "Je souhaite être contacté",
    phoneLabel: "Téléphone",
    emailLabel: "E-mail",
    send: "Envoyer ma demande",
    prayersNone: "En attente d’une première prière",
    prayersOne: "Quelqu’un a prié",
    prayersMany: (n) => `${n} personnes ont prié`,
    loading: "Chargement…",
    errorGeneric: "Une erreur est survenue. Réessaie.",
    back: "Retour",
  },
  ro: {
    languageButton: "Rugăciuni în română",
    tagline: "Cineva s-a rugat pentru tine.",
    about:
      "Spune ce te apasă. Alții se pot ruga pentru tine — în liniște, anonim. Chiar și o singură rugăciune poate fi de ajuns.",
    forOthersAction: "Roagă-te pentru cineva",
    forOthersActionHint: "Citește o cerere și lasă o rugăciune liniștită",
    forMeAction: "Cere o rugăciune",
    forMeActionHint: "Spune-ți povestea. Oamenii se vor ruga pentru tine",
    languagesTitle: "Limbă",
    forOthersTitle: "Roagă-te pentru cineva",
    forOthersIntro:
      "Fiecare poveste este o persoană care cere rugăciune. Apasă când i-ai ținut în gând. Vor vedea numărul — nu numele tău.",
    forMeTitle: "Rugăciuni pentru mine",
    forMeIntro:
      "Cererea ta rămâne aici. Când cineva se roagă, numărul crește. Chiar și una te poate întări.",
    pray: "M-am rugat",
    prayed: "Te-ai rugat",
    report: "Raportează",
    emptyFeedTitle: "Încă nu există cereri",
    emptyFeedBody:
      "Când cineva va împărtăși un moment greu în această limbă, va apărea aici.",
    emptyMineTitle: "Nu ai cerut încă",
    emptyMineBody:
      "Dacă ceva te apasă, scrie câteva cuvinte. Nu trebuie să explici totul.",
    composeTitle: "Cere o rugăciune",
    composeIntro:
      "Scrie din inimă. Fii personal — nu este un loc pentru texte lungi copiate.",
    nameLabel: "Cum să te numim?",
    messageLabel: "Ce ai pe suflet?",
    contactLabel: "Vreau să pot fi contactat",
    phoneLabel: "Telefon",
    emailLabel: "E-mail",
    send: "Trimite cererea",
    prayersNone: "Se așteaptă prima rugăciune",
    prayersOne: "S-a rugat cineva",
    prayersMany: (n) => `S-au rugat ${n} persoane`,
    loading: "Se încarcă…",
    errorGeneric: "Ceva nu a mers. Încearcă din nou.",
    back: "Înapoi",
  },
  uk: {
    languageButton: "Молитви українською",
    tagline: "Хтось помолився за тебе.",
    about:
      "Поділися тим, що важко. Інші можуть помолитися за тебе тихо й анонімно. Навіть однієї молитви може вистачити.",
    forOthersAction: "Помолитися за когось",
    forOthersActionHint: "Прочитай прохання і залиш тиху молитву",
    forMeAction: "Попросити молитву",
    forMeActionHint: "Розкажи свою історію. За тебе помоляться",
    languagesTitle: "Мова",
    forOthersTitle: "Помолитися за когось",
    forOthersIntro:
      "Кожна історія — це людина, яка просить молитви. Натисни, коли потримав їх у думках. Вони побачать число, не твоє ім’я.",
    forMeTitle: "Молитви за мене",
    forMeIntro:
      "Твої прохання залишаються тут. Коли хтось молиться, число зростає. Навіть одне може підтримати.",
    pray: "Я помолився",
    prayed: "Ти помолився",
    report: "Поскаржитися",
    emptyFeedTitle: "Поки немає прохань",
    emptyFeedBody:
      "Коли хтось поділиться важкою миттю цією мовою, воно з’явиться тут.",
    emptyMineTitle: "Ти ще не просив",
    emptyMineBody:
      "Якщо щось важко, напиши кілька слів. Не треба пояснювати все.",
    composeTitle: "Попросити молитву",
    composeIntro:
      "Пиши від серця. Будь особистим — це не місце для довгих скопійованих текстів.",
    nameLabel: "Як тебе називати?",
    messageLabel: "Що в тебе на серці?",
    contactLabel: "Хочу, щоб зі мною зв’язалися",
    phoneLabel: "Телефон",
    emailLabel: "Е-пошта",
    send: "Надіслати прохання",
    prayersNone: "Чекаємо першої молитви",
    prayersOne: "Хтось помолився",
    prayersMany: (n) => `${n} людей помолилося`,
    loading: "Завантаження…",
    errorGeneric: "Щось пішло не так. Спробуй ще раз.",
    back: "Назад",
  },
  ru: {
    languageButton: "Молитвы на русском языке",
    tagline: "Кто-то помолился за тебя.",
    about:
      "Поделись тем, что тяжело. Другие могут помолиться за тебя тихо и анонимно. Даже одной молитвы может хватить.",
    forOthersAction: "Помолиться за кого-то",
    forOthersActionHint: "Прочитай просьбу и оставь тихую молитву",
    forMeAction: "Попросить молитву",
    forMeActionHint: "Расскажи свою историю. За тебя помолятся",
    languagesTitle: "Язык",
    forOthersTitle: "Помолиться за кого-то",
    forOthersIntro:
      "Каждая история — это человек, который просит молитвы. Нажми, когда подержал их в мыслях. Они увидят число, не твоё имя.",
    forMeTitle: "Молитвы за меня",
    forMeIntro:
      "Твои просьбы остаются здесь. Когда кто-то молится, число растёт. Даже одной может хватить.",
    pray: "Я помолился",
    prayed: "Ты помолился",
    report: "Пожаловаться",
    emptyFeedTitle: "Пока нет просьб",
    emptyFeedBody:
      "Когда кто-то поделится тяжёлым моментом на этом языке, оно появится здесь.",
    emptyMineTitle: "Ты ещё не просил",
    emptyMineBody:
      "Если тяжело, напиши несколько слов. Не нужно объяснять всё.",
    composeTitle: "Попросить молитву",
    composeIntro:
      "Пиши от сердца. Будь личным — это не место для длинных скопированных текстов.",
    nameLabel: "Как тебя называть?",
    messageLabel: "Что у тебя на сердце?",
    contactLabel: "Хочу, чтобы со мной связались",
    phoneLabel: "Телефон",
    emailLabel: "Эл. почта",
    send: "Отправить просьбу",
    prayersNone: "Ждём первую молитву",
    prayersOne: "Кто-то помолился",
    prayersMany: (n) => `${n} человек помолились`,
    loading: "Загрузка…",
    errorGeneric: "Что-то пошло не так. Попробуй ещё раз.",
    back: "Назад",
  },
};

export function t(language: LanguageCode): Dictionary {
  return dictionaries[language];
}

export function prayersLabel(language: LanguageCode, count: number): string {
  const d = t(language);
  if (count <= 0) return d.prayersNone;
  if (count === 1) return d.prayersOne;
  return d.prayersMany(count);
}
