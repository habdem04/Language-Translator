import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Enable JSON parser for POST bodies
app.use(express.json());

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
      "You are a licensed multi-lingual translation and linguistic expert specializing in Amharic, English, Afaan Oromo, Tigrinya, Somali, and Chinese. " +
      `Translate each phrase from the source language code: "${sourceLang}" to these target language codes: ${JSON.stringify(targetLangs)}. ` +
      "For Amharic ('am') and Tigrinya ('ti'), use the Ethiopic/Ge'ez script. " +
      "For Chinese ('zh'), use Simplified Hanzi characters accompanied by clear Pinyin tone guides (e.g. Nǐ hǎo). " +
      "For English ('en'), Afaan Oromo ('om'), and Somali ('so'), use standard correct Latin script. " +
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

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: voicePrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' } // Cool, clean voice option
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No voice audio payload returned from Google TTS engine.");
    }

    res.json({
      audioData: base64Audio,
      mimeType: "audio/pcm;rate=24000" // Standard Gemini TTS codec output
    });
  } catch (error: any) {
    console.error("TTS Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate TTS audio stream." });
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
