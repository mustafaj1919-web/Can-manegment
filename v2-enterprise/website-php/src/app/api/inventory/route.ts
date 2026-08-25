import { NextResponse, type NextRequest } from "next/server";

const apiBase = () =>
  (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const upstream = new URL(`${apiBase()}/api/public/inventory`);

  const page = searchParams.get("page");
  const perPage = searchParams.get("per_page");
  const search = searchParams.get("search");

  if (page) upstream.searchParams.set("page", page);
  if (perPage) upstream.searchParams.set("per_page", perPage);
  if (search) upstream.searchParams.set("search", search);

  try {
    const res = await fetch(upstream.toString(), {
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Backend unreachable" }, { status: 503 });
  }
}
