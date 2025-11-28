// src/app/api/genai/plant-a-day/route.ts
import { NextResponse } from "next/server";
import { plantADay } from "../../../../genkit"; // Make sure this matches genkit.ts export

export async function GET() {
  try {
    const plant = await plantADay();

    return NextResponse.json({
      success: true,
      plant,
    });
  } catch (error) {
    console.error("Error fetching plant of the day:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get plant of the day" },
      { status: 500 }
    );
  }
}
