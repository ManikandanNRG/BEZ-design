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
    console.error("Failed to parse request body:", err);
    return NextResponse.json({ error: `Request body parsing failed: ${err.message}. Is the image too large?` }, { status: 400 });
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

    console.log("Analyzing garment with Gemini Vision...");

    const prompt = `You are an expert Technical Fashion Designer. 
    Analyze this garment sketch/mockup and generate a comprehensive Tech Pack specification.
    Provide realistic, industry-standard measurements (in inches or cm) graded from S to XXL.
    Identify the likely fabrics, trims, and construction seam types used.
    CRITICAL INSTRUCTION: DO NOT output any base64 image data or extremely long strings. Only output short, human-readable text for each field.
    Please format your output strictly according to the JSON schema.`;

    try {
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
          }
        }
      });

      const text = response.text;
      if (!text) {
          throw new Error("Failed to generate content.");
      }
      
      try {
        const data = JSON.parse(text);
        return NextResponse.json(data);
      } catch (parseError: any) {
        console.error("Failed to parse Gemini response as JSON. Response length:", text.length);
        console.error("Snippet:", text.substring(0, 200) + "...");
        return NextResponse.json({ error: `Gemini returned invalid JSON. It might have been truncated. Try a simpler image or try again. Error: ${parseError.message}` }, { status: 500 });
      }
    } catch (genError: any) {
      console.error("Gemini Generation Error:", genError);
      return NextResponse.json({ error: `AI generation failed: ${genError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Vision-to-Specs API Error:", error);
    return NextResponse.json({ error: error.message || "Critical failure" }, { status: 500 });
  }
}
