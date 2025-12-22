import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates text using the Gemini Flash model with streaming.
 */
export const generateTextStream = async function* (prompt: string) {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error: any) {
    console.error("Gemini Text API Error:", error);
    throw new Error(error.message || "Failed to generate text");
  }
};

/**
 * Generates an image using the Gemini Flash Image model.
 * Returns the base64 string of the image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    // Extract image data from parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    
    throw new Error("No image data returned from API");

  } catch (error: any) {
    console.error("Gemini Image API Error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};