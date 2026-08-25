import { type NextRequest, NextResponse } from "next/server";

const apiBase = () =>
  (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("f");

  // Block path traversal attempts
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const url = `${apiBase()}/static/uploads/vehicles/${encodeURIComponent(filename)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return new NextResponse("Not Found", { status: 404 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Upstream error", { status: 502 });
  }
}
