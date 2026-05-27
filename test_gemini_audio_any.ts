import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  for (const model of ["gemini-2.0-flash-exp", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-exp"]) {
    try {
      console.log(`Testing model ${model} for audio modalities...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: "Say clearly: Good morning in Amharic is Dehna Aderk.",
        config: {
          responseModalities: ["AUDIO"]
        }
      });
      const parts = response.candidates?.[0]?.content?.parts;
      const audioPart = parts?.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/"));
      if (audioPart) {
        console.log(`✅ Success with model ${model}! MimeType:`, audioPart.inlineData.mimeType);
        return;
      } else {
        console.log(`❌ No audio part returned for ${model}. Response had:`, JSON.stringify(parts, null, 2));
      }
    } catch (err: any) {
      console.error(`❌ Error with ${model}:`, err.message || err);
    }
  }
}

run();
