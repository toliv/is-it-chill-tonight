import { fetchEvents } from "../../lib/ra-scraper/fetchEvents";
import type { NextRequest } from "next/server";
import { syncEventDatabase } from "../../lib/ra-scraper/syncEventsDb";

import { db } from "../../server/db";
import { eventSyncWatermarks, events } from "../../server/db/schema";
import { desc, eq, asc, sql } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  // Extract venueId and forceSync from query params
  const url = new URL(request.url);
  const venueId = url.searchParams.get('venueId');
  const forceSync = url.searchParams.get('forceSync') === 'true';

  if (!venueId) {
    return new Response(JSON.stringify({ error: 'venueId is required' }), { status: 400 });
  }

  // Sync on the hotpath if we need to
  const latestWatermark = await db.select({ createdAt: eventSyncWatermarks.createdAt })
    .from(eventSyncWatermarks)
    .orderBy(desc(eventSyncWatermarks.createdAt))
    .limit(1)
    .get();

  if(forceSync){
    console.log("Syncing events to database due to forceSync flag")
    await syncEvents();
  } else {
    if(latestWatermark){
      const updatedWithinLastHour = Date.now() - latestWatermark.createdAt.getTime() < 60 * 60 * 1000;
      if(!updatedWithinLastHour){
        console.log("Syncing events to database due to stale watermark")
        await syncEvents();
      }
    }
    else {
      console.log("Syncing events to database due to no watermarks")
      await syncEvents();
    }
  }

  // Fetch the current time in NY timezone
  const currentTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const currentNYTime = new Date(currentTime);

  // Fetch the next event occurring right now or the next closest event
  const nextEvents = await db
    .select()
    .from(events)
    .where(
      sql`${events.venueId} = ${venueId} AND 
          (${events.startTime} <= ${currentNYTime.getTime()} AND ${events.endTime} >= ${currentNYTime.getTime()}) OR
          (${events.startTime} > ${currentNYTime.getTime()})`
    )
    .orderBy(asc(events.startTime))

    return new Response(JSON.stringify({data: nextEvents}), {
      headers: { 'Content-Type': 'application/json' },
    });

}

async function syncEvents(){
  const events = await fetchEvents();
  if(events){
    console.log("syncing events database");
    const inserted = await syncEventDatabase(events);
    // Insert a watermark
    await db.insert(eventSyncWatermarks).values({
      eventsSynced: inserted.length
    });
  }
}