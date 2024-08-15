import type { NextRequest } from "next/server";
import { db } from "../../server/db";
import { surveys } from "../../server/db/schema";

export const runtime = "edge";

import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  // The Drizzle db instance doesn't have .users or .venues attributes directly.
  // Instead, we need to use the table objects imported from the schema.
  // For example, to insert into the venues table:
  const body = await request.json();
  const { venueId, mellowOrDancey, crowded, securityChill, ratio, lineSpeed } = body as {
    venueId: string;
    mellowOrDancey: number;
    crowded: number;
    securityChill: number;
    ratio: number;
    lineSpeed: number;
  };

  if (!venueId || typeof mellowOrDancey !== 'number' || typeof crowded !== 'number' ||
      typeof securityChill !== 'number' || typeof ratio !== 'number' || typeof lineSpeed !== 'number') {
    return new Response('Invalid request body', { status: 400 });
  }

  const result = await db.insert(surveys).values({
    venueId,
    mellowOrDancey,
    crowded,
    securityChill,
    ratio,
    lineSpeed,
  });

	const responseText = JSON.stringify(result);
	return new Response(responseText);
}

export async function GET(request: NextRequest) {
  // Extract venueId from the request URL
  const url = new URL(request.url);
  const venueId = url.searchParams.get('venueId');

  if (!venueId) {
    return new Response('Missing venueId parameter', { status: 400 });
  }

  try {
    // Fetch surveys matching the venueId
    const surveyResults = await db
      .select({
        avgMellowOrDancey: sql`AVG(${surveys.mellowOrDancey})`.as('avgMellowOrDancey'),
        avgCrowded: sql`AVG(${surveys.crowded})`.as('avgCrowded'),
        avgSecurityChill: sql`AVG(${surveys.securityChill})`.as('avgSecurityChill'),
        avgRatio: sql`AVG(${surveys.ratio})`.as('avgRatio'),
        avgLineSpeed: sql`AVG(${surveys.lineSpeed})`.as('avgLineSpeed'),
        count: sql`COUNT(*)`.as('count'),
      })
      .from(surveys)
      .where(
        sql`${surveys.venueId} = ${venueId} AND 
            ${surveys.createdAt} >= strftime('%s', datetime('now', '-24 hours')) * 1000`
      )
      // .where(
      //   sql`${surveys.venueId} = ${venueId}`
      // )
      .groupBy(surveys.venueId);
    
    let aggregration = surveyResults[0] ?? {
      avgMellowOrDancey: 50,
      avgCrowded: 50,
      avgSecurityChill: 50,
      avgRatio: 50,
      avgLineSpeed: 50,
      count: 0,
    }

    // Return the survey results as JSON
    return new Response(JSON.stringify(aggregration), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return new Response('Error fetching surveys', { status: 500 });
  }

}
