import type { LanguageCode } from "@prayers4me/shared";

/**
 * Starter requests, shown to the first visitors so the feed is not empty. They are marked
 * `is_seed` in the database and can be removed in one statement. Names match the language's
 * region. Texts differ in length, topic and tone on purpose.
 */
export type SeedPost = {
  name: string;
  message: string;
};

export const SEED_POSTS: Record<LanguageCode, SeedPost[]> = {
  en: [
    {
      name: "Emily",
      message:
        "Please pray for my mom. She starts chemo on Monday and she is trying so hard to be brave for all of us.",
    },
    {
      name: "Liam",
      message:
        "Job interview tomorrow at 9. I have been out of work for eight months and I am running low on hope. Praying for a good day, and for peace tonight so I can sleep.",
    },
    {
      name: "Grace",
      message:
        "Thank you to whoever prayed for my son last week. He got the place at university! I still can hardly believe it.",
    },
    {
      name: "Daniel",
      message:
        "My younger brother left home after an argument with our father. Nobody has heard from him in five days. Please pray that he is safe and that he comes back soon.",
    },
    {
      name: "Priya",
      message: "feeling really anxious lately and i cannot say why. just asking for some calm.",
    },
    {
      name: "Sarah",
      message:
        "My husband and I are going through a hard season. We love each other but we have stopped listening.\n\nPray for patience, honest conversations and a little tenderness. We are trying.",
    },
    {
      name: "Tom",
      message:
        "Pray for our church family. We lost our pastor suddenly on Sunday and many of us are still in shock. His wife and the kids especially.",
    },
    {
      name: "Chloe",
      message:
        "Moving to a new city on my own next month. Excited and terrified. Please pray I find good people and a place that feels like home.",
    },
    {
      name: "Michael",
      message: "Seven months sober today. Some days are still heavy. Asking for strength for the next one.",
    },
    {
      name: "Hannah",
      message:
        "My grandmother is in hospital and the doctors say we should gather the family. She raised me while my parents worked two jobs, and she taught me to pray before I could read.\n\nI am sitting by her bed tonight. Please pray for her comfort, for the nurses who are so kind, and for all of us to be at peace with whatever comes. I do not know what to say to her, so I just hold her hand.",
    },
  ],
  es: [
    {
      name: "Camila",
      message:
        "Por favor oren por mi mamá. Empieza la quimioterapia el lunes y trata de ser valiente por todos nosotros.",
    },
    {
      name: "Mateo",
      message:
        "Mañana tengo una entrevista de trabajo. Llevo ocho meses sin empleo y ya casi no me quedan fuerzas. Pido oración por un buen día y por paz esta noche para poder dormir.",
    },
    {
      name: "Lucía",
      message:
        "Gracias a quien oró por mi hijo la semana pasada. ¡Lo aceptaron en la universidad! Todavía no me lo creo.",
    },
    {
      name: "Javier",
      message:
        "Examen final el viernes y siento que no he estudiado lo suficiente. Oren para que pueda mantener la calma y recordar lo que sé.",
    },
    {
      name: "Valentina",
      message: "últimamente tengo mucha ansiedad y no sé por qué. solo pido un poco de calma.",
    },
    {
      name: "Diego",
      message:
        "Mi esposa y yo pasamos por una temporada difícil. Nos queremos, pero dejamos de escucharnos.\n\nOren por paciencia, conversaciones sinceras y un poco de ternura. Lo estamos intentando.",
    },
    {
      name: "Rosa",
      message:
        "Oren por nuestra comunidad. El domingo perdimos de repente a nuestro pastor y muchos seguimos en shock. Sobre todo por su esposa y sus hijos.",
    },
    {
      name: "Andrés",
      message:
        "Me mudo solo a otra ciudad el mes que viene. Con ilusión y con miedo. Oren para que encuentre buena gente y un lugar donde sentirme en casa.",
    },
    {
      name: "Marta",
      message: "Hoy cumplo siete meses sin beber. Algunos días todavía pesan. Pido fuerzas para el siguiente.",
    },
    {
      name: "Sofía",
      message:
        "Mi abuela está en el hospital y los médicos dicen que reunamos a la familia. Ella me crió mientras mis papás trabajaban en dos empleos, y me enseñó a rezar antes de que yo supiera leer.\n\nEsta noche estoy sentada junto a su cama. Oren por su consuelo, por las enfermeras que son tan amables y para que todos tengamos paz con lo que venga. No sé qué decirle, así que solo le tomo la mano.",
    },
  ],
  fr: [
    {
      name: "Amélie",
      message:
        "Priez pour ma maman, s'il vous plaît. Sa chimiothérapie commence lundi et elle essaie d'être courageuse pour nous tous.",
    },
    {
      name: "Julien",
      message:
        "Entretien d'embauche demain à 9 h. Je suis sans emploi depuis huit mois et l'espoir s'amenuise. Je demande une bonne journée, et la paix ce soir pour pouvoir dormir.",
    },
    {
      name: "Fatou",
      message:
        "Merci à ceux qui ont prié pour mon fils la semaine dernière. Il a été admis à l'université ! J'ai encore du mal à y croire.",
    },
    {
      name: "Mathieu",
      message:
        "On attend un bébé dans trois mois et je suis rempli de joie, mais aussi de peur. Priez pour ma conjointe et pour que tout se passe bien.",
    },
    {
      name: "Camille",
      message: "beaucoup d'angoisse ces derniers temps et je ne sais pas pourquoi. un peu de calme, s'il vous plaît.",
    },
    {
      name: "Pierre",
      message:
        "Ma femme et moi traversons une période difficile. On s'aime, mais on ne s'écoute plus.\n\nPriez pour la patience, des conversations sincères et un peu de tendresse. On essaie.",
    },
    {
      name: "Nadia",
      message:
        "Priez pour notre communauté. Nous avons perdu notre pasteur brutalement dimanche et beaucoup d'entre nous sont encore sous le choc. Surtout pour sa femme et ses enfants.",
    },
    {
      name: "Élodie",
      message:
        "Je déménage seule dans une autre ville le mois prochain. Enthousiaste et terrifiée à la fois. Priez pour que je trouve des gens bien et un endroit où me sentir chez moi.",
    },
    {
      name: "Antoine",
      message: "Sept mois sans alcool aujourd'hui. Certains jours restent lourds. Je demande de la force pour demain.",
    },
    {
      name: "Marie-Claire",
      message:
        "Ma grand-mère est à l'hôpital et les médecins nous conseillent de réunir la famille. Elle m'a élevée pendant que mes parents travaillaient sans relâche, et c'est elle qui m'a appris à prier avant même que je sache lire.\n\nCe soir, je suis assise près de son lit. Priez pour son réconfort, pour les infirmières si bienveillantes et pour que nous soyons tous en paix avec ce qui viendra. Je ne sais pas quoi lui dire, alors je lui tiens simplement la main.",
    },
  ],
  ro: [
    {
      name: "Ioana",
      message:
        "Vă rog să vă rugați pentru mama. Începe chimioterapia luni și încearcă să fie curajoasă pentru noi toți.",
    },
    {
      name: "Andrei",
      message:
        "Mâine am interviu de angajare. De opt luni sunt fără job și speranța se împuținează. Rog o zi bună și liniște diseară, ca să pot dormi.",
    },
    {
      name: "Mihaela",
      message:
        "Mulțumesc celor care s-au rugat pentru fiul meu săptămâna trecută. A intrat la facultate! Încă nu-mi vine să cred.",
    },
    {
      name: "Cristian",
      message:
        "Examen important vineri și simt că nu am învățat destul. Rugați-vă să rămân calm și să-mi amintesc ce știu.",
    },
    {
      name: "Elena",
      message: "în ultima vreme am o anxietate mare și nu știu de ce. doar un pic de liniște.",
    },
    {
      name: "Radu",
      message:
        "Eu și soția trecem printr-o perioadă grea. Ne iubim, dar am încetat să ne ascultăm.\n\nRugați-vă pentru răbdare, discuții sincere și puțină tandrețe. Încercăm.",
    },
    {
      name: "Ana-Maria",
      message:
        "Rugați-vă pentru comunitatea noastră. Duminică l-am pierdut brusc pe pastorul nostru și mulți suntem încă în șoc. Mai ales pentru soția lui și pentru copii.",
    },
    {
      name: "Vlad",
      message:
        "Luna viitoare mă mut singur în alt oraș. Entuziasmat și speriat în același timp. Rugați-vă să găsesc oameni buni și un loc unde să mă simt acasă.",
    },
    {
      name: "Gabriela",
      message: "Azi se împlinesc șapte luni fără alcool. Unele zile sunt încă grele. Cer putere pentru ziua de mâine.",
    },
    {
      name: "Florin",
      message:
        "Bunica e internată și medicii ne spun să ne adunăm familia. M-a crescut cât timp părinții mei munceau la două servicii și m-a învățat să mă rog înainte să știu să citesc.\n\nSeara asta stau lângă patul ei. Rugați-vă pentru liniștea ei, pentru asistentele care sunt atât de blânde și pentru pacea noastră, orice ar urma. Nu știu ce să-i spun, așa că doar îi țin mâna.",
    },
  ],
  uk: [
    {
      name: "Оксана",
      message:
        "Помоліться, будь ласка, за мою маму. У понеділок починається хіміотерапія, і вона намагається триматися заради всіх нас.",
    },
    {
      name: "Тарас",
      message:
        "Завтра співбесіда о 9 ранку. Вісім місяців без роботи, надії лишається все менше. Прошу про добрий день і про спокій цієї ночі, щоб я зміг заснути.",
    },
    {
      name: "Наталя",
      message:
        "Дякую всім, хто молився за мого сина минулого тижня. Він вступив до університету! Досі не можу повірити.",
    },
    {
      name: "Андрій",
      message:
        "У п'ятницю важливий іспит, а я відчуваю, що не підготувався достатньо. Помоліться, щоб я зберіг спокій і згадав усе, що знаю.",
    },
    {
      name: "Ірина",
      message: "останнім часом дуже тривожно, а чому, не знаю. прошу лише трохи спокою.",
    },
    {
      name: "Богдан",
      message:
        "Ми з дружиною переживаємо важкий період. Ми любимо одне одного, але перестали слухати.\n\nПомоліться про терпіння, щирі розмови і трохи ніжності. Ми намагаємося.",
    },
    {
      name: "Марія",
      message:
        "Помоліться за нашу громаду. У неділю раптово пішов із життя наш пастор, і багато хто досі в шоці. Особливо за його дружину і дітей.",
    },
    {
      name: "Олег",
      message:
        "Наступного місяця переїжджаю сам до іншого міста. І радісно, і страшно. Помоліться, щоб я знайшов добрих людей і місце, де відчую себе вдома.",
    },
    {
      name: "Світлана",
      message: "Сьогодні сім місяців, як я не п'ю. Деякі дні ще важкі. Прошу сил на завтрашній.",
    },
    {
      name: "Юлія",
      message:
        "Моя бабуся в лікарні, лікарі кажуть зібрати родину. Вона виховувала мене, поки батьки працювали на двох роботах, і навчила молитися ще до того, як я навчилась читати.\n\nСьогодні ввечері я сиджу біля її ліжка. Помоліться за її полегшення, за медсестер, які такі добрі, і щоб ми всі мали мир у серці, що б не сталося. Я не знаю, що їй сказати, тому просто тримаю її за руку.",
    },
  ],
  ru: [
    {
      name: "Анна",
      message:
        "Пожалуйста, помолитесь за мою маму. В понедельник у неё начинается химиотерапия, и она старается держаться ради всех нас.",
    },
    {
      name: "Дмитрий",
      message:
        "Завтра собеседование в 9 утра. Восемь месяцев без работы, надежды остаётся всё меньше. Прошу о хорошем дне и о спокойной ночи, чтобы я смог уснуть.",
    },
    {
      name: "Елена",
      message:
        "Спасибо всем, кто молился за моего сына на прошлой неделе. Он поступил в университет! Всё ещё не верится.",
    },
    {
      name: "Сергей",
      message:
        "В пятницу важный экзамен, а мне кажется, что я недостаточно подготовился. Помолитесь, чтобы я сохранил спокойствие и вспомнил всё, что знаю.",
    },
    {
      name: "Ольга",
      message: "в последнее время очень тревожно, а почему, не знаю. прошу только немного покоя.",
    },
    {
      name: "Алексей",
      message:
        "Мы с женой переживаем трудный период. Мы любим друг друга, но перестали слушать.\n\nПомолитесь о терпении, искренних разговорах и немного нежности. Мы стараемся.",
    },
    {
      name: "Мария",
      message:
        "Помолитесь за нашу общину. В воскресенье внезапно умер наш пастор, и многие до сих пор в шоке. Особенно за его жену и детей.",
    },
    {
      name: "Иван",
      message:
        "В следующем месяце переезжаю один в другой город. И радостно, и страшно. Помолитесь, чтобы я нашёл хороших людей и место, где почувствую себя дома.",
    },
    {
      name: "Татьяна",
      message: "Сегодня семь месяцев, как я не пью. Некоторые дни всё ещё тяжёлые. Прошу сил на завтрашний.",
    },
    {
      name: "Николай",
      message:
        "Моя бабушка в больнице, врачи говорят собрать семью. Она растила меня, пока родители работали на двух работах, и научила молиться ещё до того, как я научился читать.\n\nСегодня вечером я сижу у её кровати. Помолитесь за её облегчение, за медсестёр, которые так добры, и чтобы у всех нас был мир в сердце, что бы ни случилось. Я не знаю, что ей сказать, поэтому просто держу её за руку.",
    },
  ],
};
