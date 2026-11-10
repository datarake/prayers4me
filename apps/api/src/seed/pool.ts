import type { LanguageCode } from "@prayers4me/shared";
import type { SeedPost } from "./content.js";

/**
 * More starter requests, released one at a time by the scheduled poster (see autopost.ts)
 * while a language is switched on in the admin page. Each is used once, then the pool for
 * that language is empty until more are added here.
 */
export const AUTOPOST_POOL: Record<LanguageCode, SeedPost[]> = {
  en: [
    { name: "Olivia", message: "Waiting for biopsy results. They said two to three days. Please pray for a calm mind while I wait." },
    {
      name: "Samuel",
      message:
        "My teenage daughter has become so quiet. She used to talk to me about everything and now she stays in her room. I do not want to push, and I do not want to lose her. Please pray that she feels safe enough to open up, and that I find the right moments.",
    },
    {
      name: "Rachel",
      message:
        "A close friend of mine passed away this week. We had known each other since school. I keep picking up the phone to text her.\n\nPlease pray for her family, and for me, as I learn how to miss her.",
    },
    { name: "Kevin", message: "Driving my dad to the airport at 5 a.m. for a long trip. Safe travels for him, please." },
    {
      name: "Aisha",
      message:
        "I work abroad so my children can go to school, and tonight the house feels very far away. Please pray for my kids, and for the strength to keep going until we are together again.",
    },
    { name: "Jacob", message: "My scan came back clear today. Grateful beyond words. Thank you to everyone who prayed." },
    {
      name: "Megan",
      message:
        "I am trying to forgive someone who hurt me deeply. I do not feel ready, but I know I do not want to carry this forever. Pray that my heart softens, a little at a time.",
    },
    {
      name: "Peter",
      message:
        "I read the news and feel helpless. Please pray for peace in the places where families are afraid tonight, and for those who are far from home.",
    },
  ],
  es: [
    { name: "Carolina", message: "Esperando los resultados de una biopsia. Dijeron dos o tres días. Oren por calma mientras espero." },
    {
      name: "Esteban",
      message:
        "Mi hija adolescente se ha vuelto muy callada. Antes me contaba todo y ahora se encierra en su cuarto. No quiero presionarla ni perderla. Oren para que se sienta segura y se abra, y para que yo encuentre los momentos adecuados.",
    },
    {
      name: "Paula",
      message:
        "Una amiga muy querida falleció esta semana. Nos conocíamos desde la escuela. Sigo agarrando el teléfono para escribirle.\n\nOren por su familia y por mí, mientras aprendo a extrañarla.",
    },
    { name: "Ricardo", message: "Llevo a mi papá al aeropuerto a las 5 de la mañana, va de viaje largo. Oren por su buen viaje, por favor." },
    {
      name: "Yesenia",
      message:
        "Trabajo en el extranjero para que mis hijos puedan estudiar, y esta noche la casa me parece muy lejos. Oren por mis niños y por las fuerzas para seguir hasta que estemos juntos otra vez.",
    },
    { name: "Gonzalo", message: "Hoy mi estudio salió limpio. Agradecido más allá de las palabras. Gracias a todos los que oraron." },
    {
      name: "Isabel",
      message:
        "Estoy tratando de perdonar a alguien que me lastimó mucho. No me siento lista, pero sé que no quiero cargar esto para siempre. Oren para que mi corazón se ablande poco a poco.",
    },
    {
      name: "Fernando",
      message:
        "Leo las noticias y me siento impotente. Oren por la paz en los lugares donde hoy hay familias con miedo, y por quienes están lejos de su casa.",
    },
  ],
  fr: [
    { name: "Léa", message: "J'attends les résultats d'une biopsie. On m'a dit deux à trois jours. Priez pour que je garde l'esprit calme." },
    {
      name: "Thomas",
      message:
        "Ma fille adolescente est devenue très silencieuse. Elle me racontait tout, maintenant elle reste dans sa chambre. Je ne veux ni la forcer ni la perdre. Priez pour qu'elle se sente en sécurité et s'ouvre, et pour que je trouve les bons moments.",
    },
    {
      name: "Sophie",
      message:
        "Une amie très chère est décédée cette semaine. Nous nous connaissions depuis l'école. Je prends encore mon téléphone pour lui écrire.\n\nPriez pour sa famille et pour moi, le temps d'apprendre à vivre son absence.",
    },
    { name: "Olivier", message: "J'emmène mon père à l'aéroport à 5 h du matin pour un long voyage. Priez pour sa route, s'il vous plaît." },
    {
      name: "Aminata",
      message:
        "Je travaille à l'étranger pour que mes enfants puissent étudier, et ce soir la maison me paraît très loin. Priez pour mes enfants et pour la force de tenir jusqu'à nos retrouvailles.",
    },
    { name: "Hugo", message: "Mon scanner est revenu normal aujourd'hui. Reconnaissant au-delà des mots. Merci à tous ceux qui ont prié." },
    {
      name: "Claire",
      message:
        "J'essaie de pardonner à quelqu'un qui m'a profondément blessée. Je ne me sens pas prête, mais je sais que je ne veux pas porter ça toute ma vie. Priez pour que mon cœur s'adoucisse, petit à petit.",
    },
    {
      name: "Étienne",
      message:
        "Je lis les nouvelles et je me sens impuissant. Priez pour la paix là où des familles ont peur ce soir, et pour ceux qui sont loin de chez eux.",
    },
  ],
  ro: [
    { name: "Daria", message: "Aștept rezultatele unei biopsii. Mi-au spus două-trei zile. Rugați-vă să am mintea liniștită cât aștept." },
    {
      name: "Marius",
      message:
        "Fiica mea adolescentă a devenit foarte tăcută. Înainte îmi povestea tot, acum stă închisă în cameră. Nu vreau s-o presez și nici s-o pierd. Rugați-vă să se simtă în siguranță și să se deschidă, iar eu să găsesc momentele potrivite.",
    },
    {
      name: "Laura",
      message:
        "O prietenă foarte dragă a murit săptămâna aceasta. Ne cunoșteam din școală. Tot iau telefonul ca să-i scriu.\n\nRugați-vă pentru familia ei și pentru mine, cât învăț să-i duc dorul.",
    },
    { name: "Bogdan", message: "Îl duc pe tata la aeroport la 5 dimineața, pleacă într-o călătorie lungă. Rugați-vă pentru drum bun, vă rog." },
    {
      name: "Carmen",
      message:
        "Lucrez în străinătate ca să poată copiii mei să meargă la școală, iar în seara asta casa pare foarte departe. Rugați-vă pentru copiii mei și pentru puterea de a răbda până ne vedem din nou.",
    },
    { name: "Sorin", message: "Azi mi-a ieșit scanarea curată. Recunoscător fără cuvinte. Mulțumesc tuturor celor care s-au rugat." },
    {
      name: "Alina",
      message:
        "Încerc să iert pe cineva care m-a rănit adânc. Nu mă simt pregătită, dar știu că nu vreau să duc asta toată viața. Rugați-vă ca inima mea să se înmoaie, încet, încet.",
    },
    {
      name: "Octavian",
      message:
        "Citesc știrile și mă simt neputincios. Rugați-vă pentru pace în locurile unde familiile se tem în seara asta și pentru cei care sunt departe de casă.",
    },
  ],
  uk: [
    { name: "Дарина", message: "Чекаю результати біопсії. Сказали, два-три дні. Помоліться, щоб я зберігала спокій, поки чекаю." },
    {
      name: "Павло",
      message:
        "Моя донька-підліток стала дуже мовчазною. Раніше розповідала мені все, а тепер замикається у своїй кімнаті. Не хочу тиснути і не хочу її втратити. Помоліться, щоб вона почувалася в безпеці й відкрилася, а я знайшов слушні моменти.",
    },
    {
      name: "Леся",
      message:
        "Цього тижня пішла з життя моя близька подруга. Ми знали одна одну зі школи. Я досі беру телефон, щоб їй написати.\n\nПомоліться за її родину і за мене, поки вчуся сумувати за нею.",
    },
    { name: "Віталій", message: "Везу тата в аеропорт о 5 ранку, він летить у довгу подорож. Помоліться за щасливу дорогу, будь ласка." },
    {
      name: "Галина",
      message:
        "Я працюю за кордоном, щоб мої діти могли вчитися, і цього вечора дім здається дуже далеким. Помоліться за моїх дітей і за сили дотерпіти, доки ми знову будемо разом.",
    },
    { name: "Максим", message: "Сьогодні мій знімок чистий. Вдячний без слів. Дякую всім, хто молився." },
    {
      name: "Катерина",
      message:
        "Я намагаюся пробачити людині, яка мене глибоко образила. Я не відчуваю себе готовою, але знаю, що не хочу нести це все життя. Помоліться, щоб моє серце потроху м'якшало.",
    },
    {
      name: "Роман",
      message:
        "Читаю новини і відчуваю безсилля. Помоліться про мир там, де цього вечора бояться родини, і за тих, хто далеко від дому.",
    },
  ],
  ru: [
    { name: "Дарья", message: "Жду результаты биопсии. Сказали, два-три дня. Помолитесь, чтобы я сохраняла спокойствие, пока жду." },
    {
      name: "Павел",
      message:
        "Моя дочь-подросток стала очень молчаливой. Раньше рассказывала мне всё, а теперь запирается в своей комнате. Не хочу давить и не хочу её потерять. Помолитесь, чтобы она почувствовала себя в безопасности и открылась, а я нашёл нужные моменты.",
    },
    {
      name: "Светлана",
      message:
        "На этой неделе умерла моя близкая подруга. Мы знали друг друга со школы. Я всё ещё беру телефон, чтобы ей написать.\n\nПомолитесь за её семью и за меня, пока я учусь скучать по ней.",
    },
    { name: "Виктор", message: "Везу папу в аэропорт в 5 утра, он летит в долгую поездку. Помолитесь о доброй дороге, пожалуйста." },
    {
      name: "Галина",
      message:
        "Я работаю за границей, чтобы мои дети могли учиться, и сегодня вечером дом кажется очень далёким. Помолитесь за моих детей и за силы дождаться, пока мы снова будем вместе.",
    },
    { name: "Максим", message: "Сегодня мой снимок чистый. Благодарен без слов. Спасибо всем, кто молился." },
    {
      name: "Екатерина",
      message:
        "Я пытаюсь простить человека, который глубоко меня обидел. Я не чувствую себя готовой, но знаю, что не хочу нести это всю жизнь. Помолитесь, чтобы моё сердце понемногу смягчалось.",
    },
    {
      name: "Роман",
      message:
        "Читаю новости и чувствую бессилие. Помолитесь о мире там, где сегодня вечером боятся семьи, и за тех, кто далеко от дома.",
    },
  ],
};
