import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

// Helper to remove the data URL prefix for API calls
const stripBase64Prefix = (base64Str: string) => {
  return base64Str.split(',')[1] || base64Str;
};

const getMimeType = (base64Str: string) => {
  return base64Str.split(';')[0].split(':')[1] || 'image/jpeg';
}

/**
 * Generates a reimagined room based on a style preset using Gemini 2.5 Flash Image.
 */
export const generateReimaginedRoom = async (
  imageBase64: string,
  stylePrompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Redesign this room interior. Keep the structural layout (walls, windows, doors) exactly the same. Apply the following style: ${stylePrompt}. Make it photorealistic, high quality interior design photography.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType: getMimeType(imageBase64),
              data: stripBase64Prefix(imageBase64)
            }
          }
        ]
      }
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating reimagined room:", error);
    throw error;
  }
};

/**
 * Edits an existing room image based on a specific user text prompt using Gemini 2.5 Flash Image ("Nano Banana").
 */
export const editRoomImage = async (
  imageBase64: string,
  userInstruction: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prompt engineering to ensure it acts as an editor
  const prompt = `Edit this image. Instruction: ${userInstruction}. Maintain the rest of the image exactly as is. Photorealistic.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType: getMimeType(imageBase64),
              data: stripBase64Prefix(imageBase64)
            }
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image generated.");
  } catch (error) {
    console.error("Error editing room:", error);
    throw error;
  }
};

/**
 * Chat with the AI Interior Design Consultant using gemini-3-pro-preview.
 * Supports context-awareness of the current design and uses Google Search for shoppable links.
 */
export const sendChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  currentImageBase64?: string
): Promise<ChatMessage> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare history for the model
  // We need to map our ChatMessage type to the SDK's Content type if we were using history directly,
  // but for simplicity in a stateless-like request (or complex multimodal history), we will construct the prompt carefully.
  // However, gemini-3-pro-preview handles multi-turn chat well. 
  
  // Let's construct a fresh chat session or a direct generateContent call.
  // For simplicity and robustness with image context, we'll use generateContent with the history as context in the system instruction or prompt.

  const systemInstruction = `You are an expert Interior Design Consultant. 
  Your goal is to help users refine their room designs and find products.
  The user is looking at a specific design iteration of their room.
  If the user asks for products, furniture, or decor, use Google Search to find REAL, shoppable links.
  Be helpful, concise, and stylish in your tone.`;

  const parts: any[] = [];
  
  // Add image context if available (The user is talking about THIS image)
  if (currentImageBase64) {
    parts.push({
      inlineData: {
        mimeType: getMimeType(currentImageBase64),
        data: stripBase64Prefix(currentImageBase64)
      }
    });
    parts.push({ text: "This is the current room design we are discussing." });
  }

  // Add conversation history context (simplified for single-turn logic with context)
  // Ideally, use chat.sendMessage, but mixing image context mid-chat can be tricky. 
  // We will append recent history to the prompt text.
  const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Designer'}: ${m.text}`).join('\n');
  
  const fullPrompt = `${historyText}\nUser: ${newMessage}\nDesigner:`;

  parts.push({ text: fullPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }] // Enable Google Search for shoppable links
      }
    });

    let groundingUrls: Array<{uri: string, title: string}> = [];
    
    // Extract search grounding
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach((chunk: any) => {
            if (chunk.web) {
                groundingUrls.push({ uri: chunk.web.uri, title: chunk.web.title });
            }
        });
    }

    return {
      id: Date.now().toString(),
      role: 'model',
      text: response.text || "I couldn't generate a response. Please try again.",
      timestamp: Date.now(),
      groundingUrls
    };

  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
};