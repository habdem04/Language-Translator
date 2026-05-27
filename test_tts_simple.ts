import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  try {
    console.log("Testing gemini-3.1-flash-tts-preview with NO speechConfig structure...");
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: "Say clearly: Hello user, Google Text to Speech is working perfectly.",
      config: {
        responseModalities: ["AUDIO"]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const audioPart = parts?.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/"));
    if (audioPart) {
      console.log("✅ SUCCESS! Generated audio with NO voiceName. MimeType:", audioPart.inlineData.mimeType);
      console.log("Audio Data length:", audioPart.inlineData.data?.length || 0);
    } else {
      console.log("❌ No audio part found. Response content parts:", JSON.stringify(parts, null, 2));
    }
  } catch (err: any) {
    console.error("❌ Audio Error:", err.message || err);
  }
}

run();
