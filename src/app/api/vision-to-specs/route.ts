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
            { type: "text", text: prompt + "\n\nYou MUST return a JSON object with the exact following schema: { styleName: string, description: string, category: string, fit: string, fabric: string, measurements: [{srNo: string, description: string, tol: string, s: string, m: string, l: string, xl: string, xxl: string}], bom: [{item: string, placement: string, description: string, supplier: string, color: string, qty: string}], seamDetails: [{placement: string, seamType: string, stitchType: string, spi: string, notes: string}] }" },
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
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        styleName: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { type: Type.STRING },
        fit: { type: Type.STRING },
        fabric: { type: Type.STRING },
        measurements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              srNo: { type: Type.STRING },
              description: { type: Type.STRING, description: "e.g., 1/2 Chest, Body Length, Across Shoulder" },
              tol: { type: Type.STRING, description: "e.g., 1/2" },
              s: { type: Type.STRING },
              m: { type: Type.STRING },
              l: { type: Type.STRING },
              xl: { type: Type.STRING },
              xxl: { type: Type.STRING }
            }
          }
        },
        bom: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING, description: "e.g., Main Fabric, Neck Tape, Thread, Care Label" },
              placement: { type: Type.STRING },
              description: { type: Type.STRING },
              supplier: { type: Type.STRING },
              color: { type: Type.STRING },
              qty: { type: Type.STRING }
            }
          }
        },
        seamDetails: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              placement: { type: Type.STRING, description: "e.g., Side Seams, Hem, Neckband" },
              seamType: { type: Type.STRING },
              stitchType: { type: Type.STRING, description: "e.g., 3-Thread Overlock, Single Needle" },
              spi: { type: Type.STRING, description: "Stitches Per Inch, e.g., 10-12" },
              notes: { type: Type.STRING }
            }
          }
        }
      }
    };

    const prompt = `You are an expert Technical Fashion Designer. 
    Analyze this garment sketch/mockup and generate a comprehensive Tech Pack specification.
    Provide realistic, industry-standard measurements (in inches or cm) graded from S to XXL.
    Identify the likely fabrics, trims, and construction seam types used.
    CRITICAL INSTRUCTION: DO NOT output any base64 image data or extremely long strings. Only output short, human-readable text for each field.`;

    let specData;

    if (modelPreference === 'openai') {
      specData = await callOpenAI(base64Data, mimeType, prompt);
    } else if (modelPreference === 'gemini') {
      specData = await callGemini(base64Data, mimeType, prompt, schema);
    } else {
      // Auto fallback
      try {
        specData = await callGemini(base64Data, mimeType, prompt, schema);
      } catch (e: any) {
        console.warn("Gemini is overloaded or failed, falling back to OpenAI GPT-4o-mini. Error:", e.message);
        specData = await callOpenAI(base64Data, mimeType, prompt);
      }
    }

    return NextResponse.json(specData);

  } catch (error: any) {
    console.error("Vision-to-Specs API Error:", error);
    return NextResponse.json({ error: error.message || "Critical failure" }, { status: 500 });
  }
}
