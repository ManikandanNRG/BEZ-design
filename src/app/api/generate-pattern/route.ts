import { GoogleGenAI, Type } from "@google/genai";
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

  let body;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json({ error: `Request body parsing failed: ${err.message}.` }, { status: 400 });
  }

  try {
    const { imageBase64 } = body;
    
    if (!imageBase64) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    let base64Data = "";
    let mimeType = "image/jpeg";

    if (imageBase64.startsWith('data:image')) {
      base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/);
      mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    } else if (imageBase64.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', imageBase64);
      const fileBuffer = await fs.readFile(filePath);
      base64Data = fileBuffer.toString('base64');
      const ext = path.extname(filePath).toLowerCase();
      mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    } else if (imageBase64.startsWith('http')) {
      const imageResp = await fetch(imageBase64);
      const arrayBuffer = await imageResp.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
      mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
    } else {
      base64Data = imageBase64;
    }

    console.log("Generating 2D Pattern CAD with Gemini Vision...");

    const prompt = `You are an expert technical fashion pattern maker and CAD drafter.
    Analyze the provided garment sketch/mockup.
    Predict the 2D flat sewing pattern pieces (blocks) required to construct this garment (e.g., Front Bodice, Back Bodice, Sleeve).
    For each piece, provide a unique 'id' (string), a 'name' (e.g. 'Front Bodice'), a 'color' (a distinct HSL string, e.g. 'hsl(200, 70%, 80%)'), and an array of 'points' containing {x, y} coordinates.
    The coordinates must be on a grid where x is between 0 and 400, and y is between 0 and 400. 
    Ensure the points form a closed, logical polygon resembling a standard sewing flat pattern. Snap coordinates to multiples of 20 for cleaner lines.
    CRITICAL INSTRUCTION: Output strictly as the JSON schema requested, do not output image data.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: { data: base64Data, mimeType: mimeType },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              color: { type: Type.STRING },
              points: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.INTEGER },
                    y: { type: Type.INTEGER }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("Failed to generate pattern content.");
    }
    
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (parseError: any) {
      console.error("Failed to parse Gemini response as JSON:", text.substring(0, 100));
      return NextResponse.json({ error: `Gemini returned invalid JSON pattern data. Error: ${parseError.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Generate-Pattern API Error:", error);
    return NextResponse.json({ error: error.message || "Critical failure" }, { status: 500 });
  }
}
