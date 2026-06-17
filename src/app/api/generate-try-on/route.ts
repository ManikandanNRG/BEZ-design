import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';

import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is missing. Please restart your Next.js dev server so it can load the new .env file." }, { status: 500 });
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  try {
    const body = await req.json();
    const { imageBase64, personImageBase64, mimeType, prompt, provider } = body;
    
    if (!imageBase64) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    console.log(`Generating Virtual Try-On... Provider preference: ${provider || 'gemini'}`);

    let base64Data = "";
    let actualMimeType = mimeType || "image/jpeg";

    if (imageBase64.startsWith('data:image')) {
      base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/);
      actualMimeType = mimeTypeMatch ? mimeTypeMatch[1] : actualMimeType;
    } else if (imageBase64.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', imageBase64);
      const fileBuffer = await fs.readFile(filePath);
      base64Data = fileBuffer.toString('base64');
      const ext = path.extname(filePath).toLowerCase();
      actualMimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    } else if (imageBase64.startsWith('http')) {
      const imageResp = await fetch(imageBase64);
      const arrayBuffer = await imageResp.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
      actualMimeType = imageResp.headers.get('content-type') || 'image/jpeg';
    } else {
      base64Data = imageBase64;
    }
    
    let lastError = null;
    let resultUrl = null;

    // Option A: Gemini
    if (provider === 'gemini') {
      try {
        console.log("Attempting Option A: Gemini...");
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: { data: base64Data, mimeType: mimeType || 'image/jpeg' },
              },
              {
                text: prompt || 'A professional fashion model wearing this exact garment in a high-end streetwear editorial photoshoot, realistic, detailed, high fashion.',
              },
            ],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            resultUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
            break;
          }
        }

        if (!resultUrl) {
          throw new Error("No image found in Gemini response");
        }
      } catch (error: any) {
        console.error("Gemini attempt failed:", error.message);
        lastError = error?.response?.data?.error?.message || error.message || "Unknown Gemini Error";
        try {
          const parsed = JSON.parse(lastError);
          if (parsed?.error?.message) lastError = parsed.error.message;
        } catch (e) {}
      }
    }

    // Option B: Gradio (Hugging Face Spaces - IDM-VTON) - FREE!
    if (!resultUrl) {
      console.log("Falling back to Option B: Gradio Space (yisol/IDM-VTON)...");
      try {
        // Dynamic import
        const { Client, handle_file } = await import("@gradio/client");
        
        let humanImage = personImageBase64;
        if (!humanImage) {
           humanImage = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
        }
        
        let garmStr = imageBase64;
        let humanStr = humanImage;

        const toBlob = async (dataUrl: string) => {
          const resp = await fetch(dataUrl);
          return await resp.blob();
        };

        const hfToken = process.env.HF_TOKEN;
        const connectOptions = hfToken ? { hf_token: hfToken } : {};
        const client = await Client.connect("yisol/IDM-VTON", connectOptions);
        const result = await client.predict("/tryon", [
          { background: handle_file(await toBlob(humanStr)), layers: [], composite: null },
          handle_file(await toBlob(garmStr)), 
          prompt || "A fashion apparel", 
          true, 
          true, 
          30, 
          42 
        ]);
        
        const dataArray = result.data as any[];
        if (dataArray && dataArray[0] && dataArray[0].url) {
           resultUrl = dataArray[0].url;
        } else {
           throw new Error("Invalid output from Gradio IDM-VTON.");
        }
      } catch (error: any) {
        console.error("Gradio attempt failed:", error.message);
        let detailMessage = error.message;
        if (detailMessage.includes("IndexError")) {
           detailMessage = "Could not detect a clear person/pose in the model image, or the generation failed. Please try a different photo with a clear human subject.";
        } else if (detailMessage.includes("ZeroGPU quota")) {
           detailMessage = "Hugging Face ZeroGPU quota exceeded for this account/token. Please wait for the cooldown period (usually a few hours) or try using a different Hugging Face token. You can also try switching back to the Gemini provider if it has recovered.";
        }

        const errorMessage = provider === 'huggingface' 
          ? `IDM-VTON Error: ${detailMessage}`
          : `Option A (Gemini) failed: ${lastError}. Option B (Gradio Fallback) failed: ${detailMessage}`;
        
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }
    }

    // Success - IF it's a URL (from Replicate/Gradio), convert to base64 so it doesn't expire or get blocked by CORS.
    let finalImageUrl = resultUrl;
    if (finalImageUrl && finalImageUrl.startsWith("http")) {
       try {
         const imageResp = await fetch(finalImageUrl);
         if (!imageResp.ok) {
            throw new Error(`Failed to fetch generated image from provider: ${imageResp.statusText}`);
         }
         const arrayBuffer = await imageResp.arrayBuffer();
         const mime = imageResp.headers.get("content-type") || "image/png";
         finalImageUrl = `data:${mime};base64,` + Buffer.from(arrayBuffer).toString("base64");
       } catch (e) {
         console.error("Failed to convert image to base64, returning URL:", e);
         throw e;
       }
    }

    return NextResponse.json({ imageUrl: finalImageUrl });

  } catch (error: any) {
    console.error("Try-On generation critical error:", error);
    return NextResponse.json({ error: error.message || "Critical failure" }, { status: 500 });
  }
}
