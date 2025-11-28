
import { NextRequest, NextResponse } from "next/server";
import { generateImagePrompt } from "../../../../genkit";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const plant = await req.json();

  try {
    const imagePrompt = await generateImagePrompt.run(plant);
    return NextResponse.json({ imagePrompt }, { status: 200 });
  } catch (error) {
    console.error("Error running generatePlantImagePromptFlow:", error);
    return NextResponse.json(
      { error: "Error generating plant image prompt." },
      { status: 500 }
    );
  }
}
