
import { NextRequest, NextResponse } from "next/server";
import { plantaday } from "../../../../genkit";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { plantName, context } = await req.json();

  if (!plantName || !context) {
    return NextResponse.json(
      { error: "plantName and context are required" },
      { status: 400 }
    );
  }

  try {
    const plant = await plantaday.run({ plantName, context });
    return NextResponse.json(plant, { status: 200 });
  } catch (error) {
    console.error("Error running plantADayFlow:", error);
    return NextResponse.json(
      { error: "Error generating plant of the day." },
      { status: 500 }
    );
  }
}
