import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from 'next/server';

async function callOpenAI(base64Data: string, mimeType: string, prompt: string) {
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) throw new Error("OPENAI_API_KEY is not configured.");
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt + "\n\nYou MUST return a JSON object with the exact keys requested." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });

  if (!response.ok) {
     const err = await response.json().catch(()=>({}));
     throw new Error(err.error?.message || "OpenAI API failed");
  }
  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

async function callGemini(base64Data: string, mimeType: string, prompt: string, schema: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured.");
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]}
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.1,
    }
  });

  const resultText = response.text;
  if (!resultText) throw new Error("No response from AI");
  return JSON.parse(resultText);
}

export async function POST(req: Request) {
  try {
    const { imageBase64, modelPreference = 'auto' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    let mimeType = 'image/jpeg';
    let base64Data = imageBase64;

    if (imageBase64.includes(',')) {
      const parts = imageBase64.split(',');
      const match = parts[0].match(/data:(image\/[a-zA-Z0-9]+);base64/);
      if (match && match[1]) {
        mimeType = match[1];
      }
      base64Data = parts[1];
    } else if (imageBase64.startsWith('http')) {
        const imageResp = await fetch(imageBase64);
        const arrayBuffer = await imageResp.arrayBuffer();
        base64Data = Buffer.from(arrayBuffer).toString('base64');
        mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
    } else if (imageBase64.startsWith('/')) {
        // It's a local file path (e.g., /uploads/image.png)
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', imageBase64);
        if (fs.existsSync(filePath)) {
           base64Data = fs.readFileSync(filePath, 'base64');
           const ext = path.extname(filePath).toLowerCase();
           if (ext === '.png') mimeType = 'image/png';
           else if (ext === '.webp') mimeType = 'image/webp';
           else mimeType = 'image/jpeg';
        } else {
           throw new Error(`Local file not found: ${imageBase64}`);
        }
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        garmentType: { type: Type.STRING, description: "The primary type of garment (e.g., t-shirt, hoodie, long-sleeve, pants, skirt, dress, tank-top)" },
        sleeveType: { type: Type.STRING, description: "The type of sleeves (short, long, sleeveless)" },
        hasHood: { type: Type.BOOLEAN, description: "Whether the garment has a hood" },
        hasPocket: { type: Type.BOOLEAN, description: "Whether the garment has a prominent front pocket (like a kangaroo pocket on a hoodie)" }
      },
      required: ["garmentType", "sleeveType", "hasHood", "hasPocket"]
    };

    const prompt = "You are an expert fashion technical designer. Analyze this garment sketch. What type of garment is it? What type of sleeves does it have? Does it have a hood? Does it have a front pocket? Output STRICTLY in JSON format with keys: garmentType (string), sleeveType (string), hasHood (boolean), hasPocket (boolean).";

    let classification;

    if (modelPreference === 'openai') {
      classification = await callOpenAI(base64Data, mimeType, prompt);
    } else if (modelPreference === 'gemini') {
      classification = await callGemini(base64Data, mimeType, prompt, schema);
    } else {
      // Auto fallback
      try {
        classification = await callGemini(base64Data, mimeType, prompt, schema);
      } catch (e: any) {
        console.warn("Gemini is overloaded or failed, falling back to OpenAI GPT-4o-mini. Error:", e.message);
        classification = await callOpenAI(base64Data, mimeType, prompt);
      }
    }

    return NextResponse.json(classification);

  } catch (error: any) {
    console.error("Classification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
