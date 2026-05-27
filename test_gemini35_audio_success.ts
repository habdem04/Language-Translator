import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  try {
    console.log("Testing gemini-3.5-flash with AUDIO modality...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Say clearly: Hello user, I am your Google AI Voice tutor.",
      config: {
        responseModalities: ["AUDIO"]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const audioPart = parts?.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/"));
    if (audioPart) {
      console.log("✅ SUCCESS! gemini-3.5-flash generated audio. MimeType:", audioPart.inlineData.mimeType);
      console.log("Audio Data length:", audioPart.inlineData.data?.length || 0);
    } else {
      console.log("❌ No audio part found. Response text was:", response.text);
    }
  } catch (err: any) {
    console.error("❌ gemini-3.5-flash Audio Error:", err.message || err);
  }
}

run();
