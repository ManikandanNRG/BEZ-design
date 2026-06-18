import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is missing." }, { status: 500 });
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  let body;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json({ error: `Request parsing failed: ${err.message}` }, { status: 400 });
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

    const prompt = `You are an expert Technical Fashion Designer and CAD Pattern Maker. 
    Analyze this garment sketch/mockup. Identify the exact type of garment (e.g., T-Shirt, Hoodie, Pants, Skirt).
    Based on the garment type and your knowledge of sewing pattern cutting, generate the required 2D flat pattern pieces needed to sew this garment.
    For each piece, provide a highly precise SVG path string ('d' attribute) representing its 2D CAD shape.
    Scale all paths to fit nicely within a 200x300 pixel bounding box.
    Make the curves smooth using standard bezier curves where necessary (e.g., armholes, necklines).
    Also provide a bright, pastel hex color for the piece (e.g., #fef08a, #fca5a5, #bfdbfe) and offset X, Y coordinates to arrange them neatly like an exploded view diagram.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            garmentType: { type: Type.STRING, description: "e.g., Hoodie, Skirt, Jacket" },
            pieces: {
              type: Type.ARRAY,
              description: "The sewing pattern pieces needed to construct the garment",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "e.g., Front Bodice, Left Sleeve, Hood, Back Pocket" },
                  svgData: { type: Type.STRING, description: "The raw SVG path 'd' string (e.g., M 0,0 L 100,0 ... Z)" },
                  offsetX: { type: Type.NUMBER, description: "X coordinate (0 to 800) to arrange the piece on the canvas" },
                  offsetY: { type: Type.NUMBER, description: "Y coordinate (0 to 600) to arrange the piece on the canvas" },
                  color: { type: Type.STRING, description: "A pastel hex color code" }
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
      return NextResponse.json({ error: "Invalid JSON from AI", details: text }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Pattern Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
