
import { z } from "zod";
import { defineFlow, run } from "@genkit-ai/core";
import { generate } from "@genkit-ai/ai";
import { googleAI } from "@genkit-ai/google-genai";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Zod schemas
const PlantDescriptionSchema = z.object({
  overview: z.string(),
  nickname: z.string(),
  description: z.string(),
  careInstructions: z.string(),
  funFact: z.string(),
  rarity: z.string(),
});

const PlantSchema = z.object({
  name: z.string(),
  description: PlantDescriptionSchema,
  imageUrl: z.string(),
});

const PlantADayInputSchema = z.object({
  plantName: z.string(),
  context: z.string(),
});

// MODEL INSTANCE (correct Genkit v1 usage)
const geminiFlash = googleAI({ model: 'gemini-1.5-flash'});

/**
 * PLANT A DAY FLOW
 */
export const plantaday = defineFlow(
  "plantaday",
  {
    inputSchema: PlantADayInputSchema,
    outputSchema: PlantSchema,
  },
  async ({ plantName, context }) => {
    try {
      // Generate the plant description
      const plantDescription = await run(
        "generate-plant-description",
        async () => generatePlantDescription(plantName, context)
      );

      // Generate the plant image
      const plantImage = await run("generate-plant-image", async () => {
        const res = await generate({
          model: geminiFlash,
          prompt: `A vibrant, high-resolution image of a ${plantName}, with a focus on its unique features. The background should be a simple, clean, light-colored wall. Modern, bright lighting. Square aspect ratio.`,
        });

        return res.text();
      });

      const plant = {
        name: plantName,
        description: plantDescription,
        imageUrl: plantImage,
      };

      // Store in Firestore
      await run("store-plant", async () => {
        await db.collection("plants").doc(plantName).set({
          ...plant,
          timestamp: FieldValue.serverTimestamp(),
        });
      });

      return plant;
    } catch (error) {
      console.error("Error in plantADayFlow:", error);
      throw new HttpsError("internal", "Error generating plant of the day.");
    }
  }
);

/**
 * GENERATE PLANT DESCRIPTION
 */
async function generatePlantDescription(
  plantName: string,
  context: string
): Promise<z.infer<typeof PlantDescriptionSchema>> {
  const prompt = `Generate a creative and engaging description for a new, fictional plant species called \"${plantName}\".
  This description will be used in a mobile game where users collect and care for various plants.
  The description should be concise, appealing, and suitable for a general audience.
  It should include the following elements:
  - Overview: A brief, captivating introduction to the plant.
  - Nickname: A catchy and memorable nickname for the plant.
  - Description: A more detailed look at the plant\'s appearance, characteristics, and any unique features.
  - Care Instructions: Simple, easy-to-follow care instructions.
  - Fun Fact: An interesting and surprising fact about the plant.
  - Rarity: Assign a rarity level to the plant (e.g., Common, Uncommon, Rare, Epic, Legendary).
  Context for the game: ${context}
  The output should be a JSON object with the following structure:
  {
    "overview": "string",
    "nickname": "string",
    "description": "string",
    "careInstructions": "string",
    "funFact": "string",
    "rarity": "string"
  }`;

  const llmResponse = await generate({
    model: geminiFlash,
    prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 512,
      topP: 1,
      topK: 40,
    },
  });

  const text = llmResponse.text();
  const obj = JSON.parse(text);

  PlantDescriptionSchema.parse(obj);
  return obj;
}

/**
 * GENERATE IMAGE PROMPT FLOW
 */
export const generateImagePrompt = defineFlow(
  "generateImagePrompt",
  {
    inputSchema: PlantSchema,
    outputSchema: z.string(),
  },
  async (plant) => {
    try {
      const prompt = `Generate a prompt for an image generation model to create a visually stunning image of a ${plant.name}.
      The prompt should be detailed and specific, focusing on the plant\'s unique features as described below.
      The image should be vibrant, high-resolution, and have a clean, minimalist aesthetic.
      Description:
      - Overview: ${plant.description.overview}
      - Nickname: ${plant.description.nickname}
      - Detailed Description: ${plant.description.description}
      - Rarity: ${plant.description.rarity}
      The output should be a single string that is a prompt for the image generation model.`;

      const llmResponse = await generate({
        model: geminiFlash,
        prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 256,
          topP: 1,
          topK: 40,
        },
      });

      return llmResponse.text();
    } catch (error) {
      console.error("Error in generatePlantImagePromptFlow:", error);
      throw new HttpsError(
        "internal",
        "Error generating plant image prompt."
      );
    }
  }
);
