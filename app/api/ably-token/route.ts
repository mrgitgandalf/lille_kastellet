import Ably from "ably";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const rest = new Ably.Rest({ key: process.env.ABLY_API_KEY! });
  const tokenRequest = await rest.auth.createTokenRequest({
    capability: { "room:*": ["subscribe", "presence", "history", "publish"] },
    ttl: 60 * 60 * 1000,
  });
  return NextResponse.json(tokenRequest);
}
