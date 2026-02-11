// src/app/api/genai/plant-image-prompt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "../../../../genkit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plantName } = body;

    if (!plantName || typeof plantName !== "string") {
      return NextResponse.json(
        { error: "plantName is required and must be a string." },
        { status: 400 }
      );
    }

    const result = await generateImage(plantName);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Error generating plant image:", err);
    return NextResponse.json(
      { error: "Failed to generate plant image." },
      { status: 500 }
    );
  }
}
