import { getRequestContext } from "@cloudflare/next-on-pages";
import type { NextRequest } from "next/server";
import { db } from "../../server/db";
import { venues } from "../../server/db/schema";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  // Actually pull when necessary
  const justQuery = await db.select().from(venues);

	const responseText = JSON.stringify(justQuery);
	return new Response(responseText);
}
