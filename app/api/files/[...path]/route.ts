import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { readFile, stat } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Validate auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: segments } = await params;
    const filePath = path.join(UPLOADS_DIR, ...segments);

    // Prevent directory traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check file exists
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    const data = await readFile(resolved);

    // Determine content type from extension
    const ext = path.extname(resolved).toLowerCase().slice(1);
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
      csv: "text/csv",
      md: "text/markdown",
      zip: "application/zip",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    // Determine if inline or attachment
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
    const disposition = isImage ? "inline" : "attachment";

    const filename = path.basename(resolved);
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": data.length.toString(),
      },
    });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("File serve error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
