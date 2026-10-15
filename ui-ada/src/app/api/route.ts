import { NextResponse } from "next/server";

// Necesario para el export estático de escritorio (output: 'export');
// el comportamiento en modo web no cambia (GET sin datos dinámicos).
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}