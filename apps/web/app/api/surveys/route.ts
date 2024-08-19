import type { NextRequest } from "next/server";
import { db } from "../../server/db";
import { surveys } from "../../server/db/schema";
import { desc } from 'drizzle-orm/expressions';


export const runtime = "edge";

import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  // The Drizzle db instance doesn't have .users or .venues attributes directly.
  // Instead, we need to use the table objects imported from the schema.
  // For example, to insert into the venues table:
  const body = await request.json();
  const { venueId, mellowOrDancey, crowded, securityChill, ratio, lineSpeed, comment } = body as {
    venueId: string;
    mellowOrDancey: number;
    crowded: number;
    securityChill: number;
    ratio: number;
    lineSpeed: number;
    comment: string;
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
    comment,
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
      .groupBy(surveys.venueId);
    
    let aggregration = surveyResults[0] ?? {
      avgMellowOrDancey: 50,
      avgCrowded: 50,
      avgSecurityChill: 50,
      avgRatio: 50,
      avgLineSpeed: 50,
      count: 0,
    }
    
    // Get some of the best comments
    let topComments = await db.select({
      comment: surveys.comment,
      createdAt: surveys.createdAt,
    })
    .from(surveys)
    .where(
      sql`${surveys.venueId} = ${venueId} AND 
          comment IS NOT NULL AND 
          ${surveys.createdAt} >= strftime('%s', datetime('now', '-24 hours')) * 1000`
    ).orderBy(desc(surveys.createdAt)).limit(10);

    if(topComments.length < 5){
      topComments = [...topComments, 
        {comment: "The DJ hasn't come on yet... ", createdAt: new Date()},
        {comment: "Why are drinks so expensive", createdAt: new Date()},
        {comment: "Hi Mom", createdAt: new Date()},
        {comment: "Afters ??", createdAt: new Date()},
      ]
    }

    // Get histogram data
    const hourlySubmissions = await db
      .select({
        submissionHour: sql<string>`strftime('%Y-%m-%dT%H:00:00', ${surveys.createdAt} / 1000, 'unixepoch')`.as('submission_hour'),
        submissionCount: sql<number>`COUNT(*)`.as('submission_count'),
      })
      .from(surveys)
      .where(
        sql`${surveys.venueId} = ${venueId} AND 
            ${surveys.createdAt} >= strftime('%s', datetime('now', '-24 hours')) * 1000`
      )
      .groupBy(sql`strftime('%Y-%m-%dT%H:00:00', ${surveys.createdAt} / 1000, 'unixepoch')`)
      .orderBy(sql`strftime('%Y-%m-%dT%H:00:00', ${surveys.createdAt} / 1000, 'unixepoch')`);
    
    // Fill in missing hours with zero submissions
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filledHourlySubmissions = [];

    for (let i = 0; i < 24; i++) {
      const hour = new Date(twentyFourHoursAgo.getTime() + i * 60 * 60 * 1000);
      const hourString = hour.toISOString().slice(0, 13) + ':00:00';
      
      const existingSubmission = hourlySubmissions.find(
        submission => submission.submissionHour.startsWith(hourString)
      );

      filledHourlySubmissions.push({
        submissionHour: hourString,
        submissionCount: existingSubmission ? existingSubmission.submissionCount : 0
      });
      
    }

    const response = {
      ...aggregration,
      topComments,
      hourlySubmissions: filledHourlySubmissions,
    }

    // Return the survey results as JSON
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return new Response('Error fetching surveys', { status: 500 });
  }

}
