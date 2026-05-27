import { SupportedLanguage } from "../types";

export interface DrillPhrase {
  nativeText: string;
  phonetic: string;
  meaning: string;
}

export const DRILL_BANK: Record<SupportedLanguage, DrillPhrase[]> = {
  am: [
    { nativeText: "ጤና ይስጥልኝ", phonetic: "Tena yistilign", meaning: "Hello (Most respectful greeting - May God give you health)" },
    { nativeText: "አመሰግናለሁ", phonetic: "Ameseginalehu", meaning: "Thank you" },
    { nativeText: "ውሃ የት ይገኛል?", phonetic: "Wuha yet yigegnal?", meaning: "Where can I find water?" },
    { nativeText: "ደህና ሁን", phonetic: "Dehna hun", meaning: "Goodbye (to a male)" },
    { nativeText: "ይቅርታ አድርግልኝ", phonetic: "Yiqerta adirgilign", meaning: "Forgive me / Excuse me" }
  ],
  om: [
    { nativeText: "Akkam, nagaadha?", phonetic: "Akkam, nagaadha?", meaning: "How are you? Are you at peace?" },
    { nativeText: "Galatoomi", phonetic: "Galatoo-mee", meaning: "Thank you" },
    { nativeText: "Bishaan jiraa?", phonetic: "Bishaan ji-raa?", meaning: "Is there water?" },
    { nativeText: "Nagaatti gali", phonetic: "Na-gaat-ti ga-lee", meaning: "Go home in peace (Goodbye)" },
    { nativeText: "Maaloo na ofkolchi", phonetic: "Maa-loo na of-kol-chee", meaning: "Please excuse me / pardon me" }
  ],
  ti: [
    { nativeText: "ከመይ ኣለኻ", phonetic: "Kemey aleka", meaning: "How are you? (to a male)" },
    { nativeText: "የቀንየለይ", phonetic: "Yeken-ye-ley", meaning: "Thank you" },
    { nativeText: "ማይ ኣበይ ኣሎ?", phonetic: "May abey a-lo?", meaning: "Where is the water?" },
    { nativeText: "ደሓን እቶ", phonetic: "Dehan eto", meaning: "Go in peace / Goodbye (to a male)" },
    { nativeText: "ይቕሬታ ግበረለይ", phonetic: "Yiqreyta gibereley", meaning: "Excuse me / Forgive me" }
  ],
  so: [
    { nativeText: "Sidee tahay? Ma nabad baa?", phonetic: "See-deh ta-hay? Ma na-bad baa?", meaning: "How are you? Is it peace?" },
    { nativeText: "Aad baad u mahadsantahay", phonetic: "Aad baad oo ma-had-san-ta-hay", meaning: "Thank you very much" },
    { nativeText: "Halkee buu joogaa dhakhtarku?", phonetic: "Hal-kay buu joh-gah dakh-tar-ku?", meaning: "Where is the doctor?" },
    { nativeText: "Nabadeey", phonetic: "Na-ba-day", meaning: "Goodbye / Peace" },
    { nativeText: "Iga raali ahoow", phonetic: "I-ga raa-li a-hoow", meaning: "Pardon me / Excuse me" }
  ],
  zh: [
    { nativeText: "你好，很高兴认识你", phonetic: "Nǐ hǎo, hěn gāoxìng rènshi nǐ", meaning: "Hello, very pleased to meet you" },
    { nativeText: "谢谢你对我的热心帮助", phonetic: "Xièxie nǐ duì wǒ de rèxīn bāngzhù", meaning: "Thank you for your warm help" },
    { nativeText: "请问洗手间在哪里？", phonetic: "Qǐngwèn xǐshǒujiān zài nǎlǐ?", meaning: "Excuse me, where is the restroom?" },
    { nativeText: "祝你今天过得愉快", phonetic: "Zhù nǐ jīntiān guò de yúkuài", meaning: "Have a wonderful day!" },
    { nativeText: "非常抱歉，我迟到了", phonetic: "Fēicháng bàoqiàn, wǒ chídào le", meaning: "I am extremely sorry for being late" }
  ],
  fr: [
    { nativeText: "Bonjour, comment ça va aujourd'hui ?", phonetic: "Boan-zhoor, ko-mahn sah vah o-zhoor-dwee?", meaning: "Hello, how are you doing today?" },
    { nativeText: "Merci beaucoup pour votre hospitalité", phonetic: "Mair-see boh-coo poor voat-ruh os-pee-tah-lee-tay", meaning: "Thank you very much for your hospitality" },
    { nativeText: "S'il vous plaît, où se trouve le marché ?", phonetic: "Seel voo play, oo seh troov luh mar-shay?", meaning: "Please, where is the market located?" },
    { nativeText: "Au revoir, à la prochaine !", phonetic: "Oh r'vwahr, ah lah pro-shain!", meaning: "Goodbye, see you next time!" },
    { nativeText: "Excusez-moi du dérangement", phonetic: "Ex-cue-zay mwah du day-rahnz-mahn", meaning: "Excuse me for the disturbance" }
  ],
  ar: [
    { nativeText: "السلام عليكم ورحمة الله وبركاته", phonetic: "As-salāmu ʿalaykum wa-raḥmatu -llāhi wa-barakātuh", meaning: "Peace be upon you, and the mercy of God and His blessings" },
    { nativeText: "شكراً جزيلاً لك على كرمك", phonetic: "Shukran jazīlan lak ʿalā karamik", meaning: "Thank you very much for your generosity" },
    { nativeText: "أين يمكنني العثور على ماء صالح للشرب؟", phonetic: "Ayna yumkinunī al-ʿuthūru ʿalā māʾin ṣāliḥin lish-shurb?", meaning: "Where can I find clean drinking water?" },
    { nativeText: "مع السلامة، أراك قريباً", phonetic: "Maʿas-salāmah, arāka qarīban", meaning: "Goodbye, see you soon" },
    { nativeText: "لو سمحت، أنا بحاجة إلى مساعدة", phonetic: "Law samaḥt, ana bi-ḥājatin ilā musāʿadah", meaning: "Excuse me, I am in need of assistance" }
  ],
  es: [
    { nativeText: "Hola, ¿cómo estás hoy? ¡Qué gusto verte!", phonetic: "Oh-lah, coh-moh ess-tass oy? ¡Kay goos-toh vair-teh!", meaning: "Hello, how are you today? It is great to see you!" },
    { nativeText: "Muchas gracias por tu valiosa hospitalidad", phonetic: "Moo-chas grah-syas por too vah-lyoh-sah os-pee-tah-lee-dad", meaning: "Thank you very much for your valuable hospitality" },
    { nativeText: "Disculpe, ¿dónde queda el hospital más cercano?", phonetic: "Dees-cool-peh, ¿dohn-deh kay-dah el os-pee-tal mass ser-cah-noh?", meaning: "Excuse me, where is the nearest hospital?" },
    { nativeText: "¡Adiós, que tengas un excelente viaje!", phonetic: "¡Ah-dyohs, kay ten-gass oon ek-seh-len-teh vyah-heh!", meaning: "Goodbye, have an excellent trip!" },
    { nativeText: "Por favor, ¿me puedes ayudar con esto?", phonetic: "Por fah-vor, ¿meh pweh-dehss ah-yoo-dar con ess-toh?", meaning: "Please, can you help me with this?" }
  ],
  en: [
    { nativeText: "Good morning! It is wonderful to practice together today.", phonetic: "Good morning! It is wonderful to practice together today.", meaning: "Standard morning greeting" },
    { nativeText: "Could you please guide me to the nearest town center?", phonetic: "Could you please guide me to the nearest town center?", meaning: "Asking for directions" },
    { nativeText: "Thank you for being such an encouraging and patient tutor.", phonetic: "Thank you for being such an encouraging and patient tutor.", meaning: "Expressing gratitude to an instructor" },
    { nativeText: "Goodbye, and I look forward to our next study session.", phonetic: "Goodbye, and I look forward to our next study session.", meaning: "Standard polite parting" },
    { nativeText: "I am doing my absolute best to perfect my speech accent.", phonetic: "I am doing my absolute best to perfect my speech accent.", meaning: "Determined learning statement" }
  ]
};
