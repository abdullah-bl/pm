import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { promises as fs } from "fs";
import path from "path";

const BACKUPS_DIR = path.join(process.cwd(), "backups");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;

  // Prevent path traversal
  const safeName = filename.replace(/[/\\]/g, "");
  if (safeName !== filename || !filename.endsWith(".json")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const filePath = path.join(BACKUPS_DIR, filename);
    const content = await fs.readFile(filePath, "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
