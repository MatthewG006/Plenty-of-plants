import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // This route is temporarily disabled to resolve a build issue.
  return NextResponse.json({ status: "ok" });
}
