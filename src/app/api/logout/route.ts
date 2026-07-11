import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    domain: COOKIE_DOMAIN,
  });
  return res;
}
