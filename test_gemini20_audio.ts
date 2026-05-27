import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  try {
    console.log("Testing gemini-2.0-flash for audio modality extraction...");
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say clearly: Good morning in Amharic is Dehna Aderk.",
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" }
          }
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const audioPart = parts?.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/"));
    if (audioPart) {
      console.log("✅ SUCCESS! gemini-2.0-flash synthesized audio. MimeType:", audioPart.inlineData.mimeType);
      console.log("Audio Data length:", audioPart.inlineData.data?.length || 0);
    } else {
      console.log("❌ No audio part found under gemini-2.0-flash. Response candidates/parts:", JSON.stringify(parts, null, 2));
    }
  } catch (err: any) {
    console.error("❌ gemini-2.0-flash Audio Error:", err.message || err);
  }
}

run();
