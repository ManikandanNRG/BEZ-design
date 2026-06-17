import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = body;
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    console.log(`Generating image for prompt: "${prompt}"`);

    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const base64EncodeString = response.generatedImages?.[0]?.image?.imageBytes;

    if (base64EncodeString) {
      const imageUrl = `data:image/jpeg;base64,${base64EncodeString}`;
      return NextResponse.json({ imageUrl });
    } else {
      return NextResponse.json({ error: "No image found in response" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Image generation error:", error);
    const msg = error?.response?.data?.error?.message || error.message || "Failed to generate image";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
