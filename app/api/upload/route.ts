import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { createAttachment } from "@/lib/data";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "webp"],
  document: ["pdf", "doc", "docx", "xls", "xlsx"],
  text: ["txt", "csv", "md"],
  archive: ["zip"],
};

const ALLOWED_EXTENSIONS = new Set(
  Object.values(ALLOWED_TYPES).flat()
);

const MIME_MAP: Record<string, string> = {
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

export async function POST(req: NextRequest) {
  try {
    // Validate auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string | null;
    const commentId = formData.get("commentId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!taskId) {
      return NextResponse.json({ error: "No taskId provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `File type .${ext} not allowed` },
        { status: 400 }
      );
    }

    // Generate storage path
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const uuid = crypto.randomUUID();
    const storedName = `${uuid}.${ext}`;
    const relativePath = `uploads/${year}/${month}/${storedName}`;

    // Ensure directory exists and write file
    const fullPath = path.join(process.cwd(), relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    // Determine mimetype
    const mimetype = MIME_MAP[ext] || file.type || "application/octet-stream";

    // Create DB record
    const attachment = await createAttachment({
      url: `/${relativePath}`,
      filename: file.name,
      mimetype,
      size: file.size,
      taskId,
      commentId: commentId || null,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
