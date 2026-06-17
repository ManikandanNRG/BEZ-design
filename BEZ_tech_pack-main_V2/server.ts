import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      console.log(`Generating image for prompt: "${prompt}"`);

      // Using imagen-3.0-generate-002 for image generation
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
        res.json({ imageUrl });
      } else {
        res.status(500).json({ error: "No image found in response" });
      }
    } catch (error: any) {
      console.error("Image generation error:", error);
      const msg = error?.response?.data?.error?.message || error.message || "Failed to generate image";
      res.status(500).json({ error: msg });
    }
  });

  // Virtual Try-On endpoint
  app.post("/api/generate-try-on", async (req, res) => {
    try {
      const { imageBase64, personImageBase64, mimeType, prompt, provider } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      console.log(`Generating Virtual Try-On... Provider preference: ${provider || 'gemini'}`);

      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      
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
          // Dynamic import since we are in ES/CommonJS mixed env with @gradio/client
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
          
          return res.status(500).json({ error: errorMessage });
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
           // If we failed to fetch it, the URL itself is probably broken/expired. We should throw so it shows as an error instead of a broken image.
           throw e;
         }
      }

      return res.json({ imageUrl: finalImageUrl });

    } catch (error: any) {
      console.error("Try-On generation critical error:", error);
      res.status(500).json({ error: error.message || "Critical failure" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
