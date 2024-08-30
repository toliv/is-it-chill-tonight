import { getRequestContext } from "@cloudflare/next-on-pages";
import type { NextRequest } from "next/server";
import { db } from "../../server/db";
import { venues, surveys } from "../../server/db/schema";
import { sql, eq, count } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  // Return all venues with a count of submitted surveys in the last 24 hours
  const justQuery = await db
    .select({
      id: venues.id,
      name: venues.name,
      surveyCount: sql`COALESCE(${count(surveys.id)}, 0)`.as("surveyCount")
    })
    .from(venues)
    .leftJoin(surveys, sql`venues.id=surveys.venueId AND surveys.createdAt >= strftime('%s', 'now', '-24 hours') * 1000`)
    .groupBy(venues.id)
    .orderBy(sql`surveyCount DESC`);

    // RAW query as reference

//   const rawQuery = await db.all(sql`
//     SELECT 
//         v.id,
//         v.name,
//         COALESCE(COUNT(s.id), 0) AS survey_count
//     FROM 
//         venues v
//     LEFT JOIN 
//         surveys s 
//     ON 
//         v.id = s.venueId 
//         AND s.createdAt >= strftime('%s', 'now', '-24 hours') * 1000
//     GROUP BY 
//         v.id, v.name;
// `);

	const responseText = JSON.stringify(justQuery);
	return new Response(responseText);
}
