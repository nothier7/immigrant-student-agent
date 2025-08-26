// minimal safe fix
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const err = searchParams.get("error");
  if (err) {
    return NextResponse.redirect(new URL(`/auth/error?message=${encodeURIComponent(err)}`, req.url));
  }
  return NextResponse.redirect(new URL("/", req.url));
}
