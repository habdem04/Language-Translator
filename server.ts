import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Enable JSON parser for POST bodies with increased limits for multi-file and audio payloads
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Lazy-initialize Gemini API to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is missing or unconfigured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Health check API
app.get("/api/health", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({
    status: "ok",
    apiKeyConfigured: hasKey,
    timestamp: new Date().toISOString()
  });
});

// 2. Translation API Route using Gemini-3.5-flash with a strict JSON format schema
app.post("/api/translate", async (req, res) => {
  try {
    const { text, phrases, sourceLang = "am", targetLangs = ["en", "om", "ti", "so", "zh"] } = req.body;
    
    let phraseList: string[] = [];
    if (phrases && Array.isArray(phrases)) {
      phraseList = phrases;
    } else if (text && typeof text === "string") {
      phraseList = [text];
    }

    if (phraseList.length === 0) {
      res.status(400).json({ error: "No source phrases specified to translate." });
      return;
    }

    const ai = getAiClient();

    // System prompt instructing the model to be a multi-lingual translation expert
    const systemInstruction = 
      "You are a licensed multi-lingual translation and linguistic expert specializing in Amharic, English, Afaan Oromo, Tigrinya, Somali, Chinese, French, Arabic, and Spanish. " +
      `Translate each phrase from the source language code: "${sourceLang}" to these target language codes: ${JSON.stringify(targetLangs)}. ` +
      "For Amharic ('am') and Tigrinya ('ti'), use the Ethiopic/Ge'ez script. " +
      "For Chinese ('zh'), use Simplified Hanzi characters accompanied by clear Pinyin tone guides (e.g. Nǐ hǎo). " +
      "For Arabic ('ar'), use the Arabic Abjad script from right-to-left layout with clear vowel markers, and standard romanized Phonetic transliteration. " +
      "For English ('en'), Afaan Oromo ('om'), Somali ('so'), French ('fr'), and Spanish ('es'), use standard correct Latin script with proper diacritics and accents. " +
      "Generate standard, clear phonetic pronunciation guides (phonetic transliterations) for ALL translation results, so English or non-native speakers can pronounce them accurately. " +
      "Inside the 'grammarBreakdown' array, provide a morphological breakdown of the words in the original phrase with parts of speech and translation meanings. " +
      "Inside the 'syllables' array, split the original phrase into logical phonetic pronunciation syllables or segments.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Source Language: "${sourceLang}"\nTarget Languages: ${JSON.stringify(targetLangs)}\nTranslate these phrases:\n${JSON.stringify(phraseList)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalText: { type: Type.STRING },
                  translations: {
                    type: Type.OBJECT,
                    properties: {
                      am: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      en: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      om: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      ti: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      so: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      zh: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      fr: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      ar: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      },
                      es: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          phonetic: { type: Type.STRING },
                          notes: { type: Type.STRING }
                        },
                        required: ["text", "phonetic"]
                      }
                    }
                  },
                  grammarBreakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING, description: "source word split" },
                        pos: { type: Type.STRING, description: "Part of Speech (e.g. Noun, Verb)" },
                        meaning: { type: Type.STRING, description: "Target meaning" }
                      },
                      required: ["word", "pos", "meaning"]
                    }
                  },
                  syllables: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["originalText", "translations"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    const bodyText = response.text || "{}";
    const resultJson = JSON.parse(bodyText);

    res.json(resultJson);
  } catch (error: any) {
    console.error("Translation Endpoint Error:", error);
    res.status(500).json({
      error: error.message || "Failed to contact translation AI server.",
      isOfflineFallback: true
    });
  }
});

// 2b. Multimodal Document and Camera Translation API Route
app.post("/api/translate-file", async (req, res) => {
  try {
    const { fileBase64, mimeType, targetLangs = ["am", "en", "om", "ti", "so", "zh", "fr", "ar", "es"] } = req.body;

    if (!fileBase64) {
      res.status(400).json({ error: "No file data specified." });
      return;
    }

    if (!mimeType) {
      res.status(400).json({ error: "No file MIME type specified." });
      return;
    }

    // Strip any potential data HTML base64 prefix
    let cleanBase64 = fileBase64;
    if (fileBase64.includes(";base64,")) {
      cleanBase64 = fileBase64.split(";base64,")[1];
    }

    const ai = getAiClient();

    const systemInstruction = 
      "You are a licensed multi-lingual legal translation and linguistic expert specializing in Amharic, English, Afaan Oromo, Tigrinya, Somali, Chinese, French, Arabic, and Spanish. " +
      "Analyze the attached file (which could be an image, a PDF, or a text document). " +
      "First, transcribe the main text, signs, labels, tables, or contents present in the document or image. Be precise and detect the primary language. " +
      "Identify the logical layout of the file. Classify and set 'docType' in each result item to either: " +
      " - 'table' if the file contains a table, schedule, invoice list, grid, or structured rows and columns. " +
      " - 'form' if the file lists keys and values, label-inputs, or personal details fields. " +
      " - 'document' if the file represents a block of continuous paragraphs with headings, agreements, certificates, or text pages. " +
      " - 'text' if it is standard raw text or casual phrase content. " +
      "Translate the transcribed, compiled text into all the target languages specified: " + JSON.stringify(targetLangs) + ". " +
      "Crucially, translate other structural elements: " +
      " - If 'docType' is 'table', translate the headers and cells of the table into each target language, returning it in the corresponding language's 'tableData'. " +
      " - If 'docType' is 'form', translate the labels and values, returning it in 'formData'. " +
      " - If 'docType' is 'document', translate the sections/headings, returning it in 'documentData'. " +
      "The result must have translations for ALL requested languages (including the original source language itself). " +
      "For Amharic ('am') and Tigrinya ('ti'), use the Ethiopic/Ge'ez script. " +
      "For Chinese ('zh'), use Simplified Hanzi characters with clear Pinyin guides. " +
      "For Arabic ('ar'), use Arabic Abjad script, right-to-left layout, vowel markers, and standard phonetic transliteration. " +
      "For English ('en'), Afaan Oromo ('om'), Somali ('so'), French ('fr'), and Spanish ('es'), use standard correct Latin script. " +
      "Generate standard, clear phonetic pronunciation guides (phonetic transliterations) for ALL translation results. " +
      "Inside the 'grammarBreakdown' array, provide a morphological breakdown of the words in the original phrase. " +
      "Provide a realistic legal certified translation seal details inside the 'certification' object, including an official seal/stamp assertion ID (e.g., 'EAS-CERT-2026-XXXX'), a seal text, the date, and signee name. " +
      "Ensure all required structural fields are perfectly aligned with the layout.";

    const filePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64
      }
    };

    const textPart = {
      text: `Identify the main structure of this document, transcribe it, translate it, and produce formal layouts matched with a valid certification of accuracy.`
    };

    const translationDetailSchema = {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING },
        phonetic: { type: Type.STRING },
        notes: { type: Type.STRING },
        tableData: {
          type: Type.OBJECT,
          properties: {
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          }
        },
        formData: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING }
            },
            required: ["label", "value"]
          }
        },
        documentData: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  paragraph: { type: Type.STRING }
                },
                required: ["paragraph"]
              }
            }
          }
        }
      },
      required: ["text", "phonetic"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [filePart, textPart],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalText: { type: Type.STRING, description: "The transcribed original text from the document/image" },
                  docType: { type: Type.STRING, description: "One of: 'text', 'document', 'table', 'form'" },
                  translations: {
                    type: Type.OBJECT,
                    properties: {
                      am: translationDetailSchema,
                      en: translationDetailSchema,
                      om: translationDetailSchema,
                      ti: translationDetailSchema,
                      so: translationDetailSchema,
                      zh: translationDetailSchema,
                      fr: translationDetailSchema,
                      ar: translationDetailSchema,
                      es: translationDetailSchema
                    }
                  },
                  grammarBreakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING, description: "source word split" },
                        pos: { type: Type.STRING, description: "Part of Speech (e.g. Noun, Verb, Pronoun)" },
                        meaning: { type: Type.STRING, description: "Target meaning" }
                      },
                      required: ["word", "pos", "meaning"]
                    }
                  },
                  syllables: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  certification: {
                    type: Type.OBJECT,
                    properties: {
                      certId: { type: Type.STRING },
                      stampText: { type: Type.STRING },
                      date: { type: Type.STRING },
                      signature: { type: Type.STRING },
                      firmName: { type: Type.STRING }
                    },
                    required: ["certId", "stampText", "date", "signature", "firmName"]
                  }
                },
                required: ["originalText", "docType", "translations", "certification"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    const bodyText = response.text || "{}";
    const resultJson = JSON.parse(bodyText);

    res.json(resultJson);
  } catch (error: any) {
    console.error("Translate File Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to contact multimodal translation AI server." });
  }
});

// 3. Pronunciation Audio API Route using Gemini 3.1 Flash TTS Preview
app.post("/api/tts", async (req, res) => {
  try {
    const { text, language, phonetic } = req.body;
    if (!text) {
      res.status(400).json({ error: "Missing transcript text to synthesize." });
      return;
    }

    const ai = getAiClient();

    // Tell TTS model how to say/accentuate based on language structure
    const voicePrompt = `Say clearly with accurate geographic native pronunciation accents for the ${language} language. The text is:\n"${text}". If helpful, refer to this approximate sound phonetic: ${phonetic || ""}.`;

    let response;
    let base64Audio = null;

    // Retry block to handle voice configuration inconsistencies gracefully across environments
    const voiceAttempts = [
      { name: "Aoede", useConfig: true },
      { name: "Puck", useConfig: true },
      { name: "Default", useConfig: false }
    ];

    let lastErrorMsg = "";

    for (const attempt of voiceAttempts) {
      try {
        console.log(`[Google TTS] Attempting synthesis using model 'gemini-3.1-flash-tts-preview' with voice: ${attempt.name}`);
        
        let config: any = {
          responseModalities: ["AUDIO"]
        };

        if (attempt.useConfig) {
          config.speechConfig = {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: attempt.name }
            }
          };
        }

        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: voicePrompt }] }],
          config: config
        });

        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (data) {
          base64Audio = data;
          console.log(`[Google TTS] Synthesis succeeded with voice: ${attempt.name}`);
          break; // Succeeded!
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err);
        console.warn(`[Google TTS] Synthesis attempt with voice: ${attempt.name} failed:`, lastErrorMsg);
        
        // If we hit real 429 quota/resource exhaustion, do not retry other voices in a tight loop to protect resources
        if (lastErrorMsg.includes("429") || lastErrorMsg.includes("RESOURCE_EXHAUSTED") || lastErrorMsg.includes("quota")) {
          break;
        }
      }
    }

    if (!base64Audio) {
      throw new Error(`Google TTS engine failed to return audio. Reason: ${lastErrorMsg || "No response received"}`);
    }

    res.json({
      audioData: base64Audio,
      mimeType: "audio/pcm;rate=24000" // Standard Gemini TTS codec output
    });
  } catch (error: any) {
    console.error("TTS Endpoint Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to generate TTS audio stream.",
      isQuotaExceeded: error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota")
    });
  }
});

// 3b. Interactive Discussion & AI Studio Companion API Route using GoogleGenAI
app.post("/api/chat", async (req, res) => {
  try {
    const { model = "gemini-3.5-flash", messages, systemInstruction, temperature = 1.0 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
      return;
    }

    const ai = getAiClient();

    const contents = messages.map((msg: any) => {
      const parts: any[] = [];
      if (msg.text) {
        parts.push({ text: msg.text });
      }
      if (msg.audioBase64) {
        // Handle webm, ogg, or any other format that MediaRecorder might spit out
        let cleanBase64 = msg.audioBase64;
        if (msg.audioBase64.includes("base64,")) {
          cleanBase64 = msg.audioBase64.split("base64,")[1];
        }
        parts.push({
          inlineData: {
            mimeType: msg.audioMimeType || "audio/webm",
            data: cleanBase64
          }
        });
      }
      return {
        role: msg.role === "user" ? "user" : "model",
        parts
      };
    });

    let response;
    try {
      // Force 'gemini-3.5-flash' consistently as the primary model and bypass unsupported or legacy parameters
      const targetModel = "gemini-3.5-flash";
      response = await ai.models.generateContent({
        model: targetModel,
        contents: contents,
        config: {
          systemInstruction: systemInstruction || "You are a bilingual language instructor specializing in East African languages.",
          temperature: Number(temperature),
        }
      });
    } catch (genError: any) {
      const errMsg = genError?.message || "";
      // If the primary model is busy, rate-limited, or overloaded, fall back immediately to the stable and fast gemini-flash-latest
      // Ensure we do not call nonexistent models like gemini-1.5-flash
      if (
        errMsg.includes("503") || 
        errMsg.includes("429") || 
        errMsg.includes("RESOURCE_EXHAUSTED") || 
        errMsg.includes("demand") || 
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("not found")
      ) {
        console.warn("Primary gemini-3.5-flash model busy, unavailable, or rate-limited. Falling back to robust gemini-flash-latest. Error was:", errMsg);
        response = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: contents,
          config: {
            systemInstruction: systemInstruction || "You are a bilingual language instructor specializing in East African languages.",
            temperature: Number(temperature),
          }
        });
      } else {
        throw genError;
      }
    }

    res.json({
      text: response.text || ""
    });
  } catch (error: any) {
    console.error("AI Chat Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response." });
  }
});

// 3c. 'Repeat After Me' AI Pronunciation Evaluation API Route using Gemini 3.5-flash audio analyzing capability
app.post("/api/analyze-pronunciation", async (req, res) => {
  try {
    const { targetText, targetPhonetic, language, audioBase64, audioMimeType } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: "Missing user audio recording to analyze." });
      return;
    }

    const ai = getAiClient();

    let cleanBase64 = audioBase64;
    if (audioBase64.includes("base64,")) {
      cleanBase64 = audioBase64.split("base64,")[1];
    }

    const prompt = `You are an expert linguistic accent coach and phonetic speech analyst specializing in the teaching of ${language}.
Analyze the user's audio recording by comparing their spoken pronunciation against the expected native target:
- Expected native phrase: "${targetText}"
- Target phonetics: "${targetPhonetic || ""}"

Listen intently to the syllable stress, tongue placement, vowel depth, and accent accuracy of the user's speech.
Return your evaluation inside a valid JSON object with the following fields:
{
  "score": <an integer between 0 and 100 reflecting overall pronunciation/accent accuracy>,
  "confidence": <one of "Excellent" | "Good" | "Fair" | "Keep practicing">,
  "feedback": "<clear, actionable phonetic feedback focusing on specific syllables or sounds the user spoke correctly or needs to focus on>",
  "phoneticGuidance": "<step-by-step guidance on how to make correct native tongue, lips, and throat sounds for this specific phrase>",
  "ipaMatch": "<approximate IPA or vocal sound matching comparison or syllable breakdown>"
}

Strict Note: Return ONLY a raw JSON string. Do not wrap it in markdown codeblocks (no \`\`\`json). Just the JSON of the evaluation!`;

    const contents = [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: audioMimeType || "audio/webm",
              data: cleanBase64
            }
          }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const replyText = response.text || "{}";
    let scoreJson;
    try {
      scoreJson = JSON.parse(replyText);
    } catch (parseErr) {
      console.warn("Failed to parse JSON reply from Gemini, attempting regex extract", replyText);
      const jsonMatch = replyText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoreJson = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format from audio analyzer model.");
      }
    }

    res.json(scoreJson);
  } catch (error: any) {
    console.error("Pronunciation Analyzer API Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze pronunciation audio stream." });
  }
});

// 3.5. Word Definition Dictionary API Route using Gemini-3.5-flash
app.post("/api/word-definition", async (req, res) => {
  try {
    const { word, pos, meaning, language = "Amharic" } = req.body;
    if (!word) {
      res.status(400).json({ error: "Word parameter is required." });
      return;
    }

    const ai = getAiClient();
    const prompt = 
      `You are an expert bilingual lexicographer. Provide a detailed, highly accurate dictionary definition for the word: "${word}".\n` +
      `Additional context: Part of speech is "${pos || ''}", draft meaning is "${meaning || ''}", and language is "${language}".\n` +
      `Return a valid JSON object matching this schema:\n` +
      `{\n` +
      `  "word": string,\n` +
      `  "pos": string,\n` +
      `  "pronunciation": string (phonetic pronunciation guide),\n` +
      `  "definition": string (detailed educational linguistic dictionary definition),\n` +
      `  "example": string (example sentence showing usage in the source language, with English translation in parentheses),\n` +
      `  "synonyms": array of strings (at least 2-4 synonyms or closely associated terms)\n` +
      `}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            pos: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            synonyms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["word", "pos", "pronunciation", "definition", "example", "synonyms"]
        }
      }
    });

    const replyText = response.text || "{}";
    res.json(JSON.parse(replyText));
  } catch (error: any) {
    console.error("Word Definition dictionary API error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch word definition." });
  }
});

// 4. Mount Vite developer middlewares or production express statics
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[East African Translator Server] listening at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Critical Server Bootstrap Failure:", err);
  process.exit(1);
});
