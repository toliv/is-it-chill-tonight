import {Artist, EventListing} from "./fetchEvents";
import { db } from "../../server/db";
import { events, venues,surveys } from "../../server/db/schema";
import { count, sql } from "drizzle-orm";
import { DateTime } from "luxon";


export async function syncEventDatabase(eventListings: EventListing[]){
  // Bring venues into memory bc small size
  const allVenues = await db.select({id:venues.id, name: venues.name}).from(venues);
  const quickMap = new Map<string,string>();
  allVenues.map((venue) => quickMap.set(venue.name.toLowerCase(), venue.id));
  const toInsert: typeof events.$inferInsert[] = [];

  const missingVenues = new Set<string>();

  eventListings.map(async (eventListing) => {
    const fields = extractEventFields(eventListing);
    // Search for venue ID
    // Better solution is probably to backfill a RA ID on the venue table
    const venueId = quickMap.get(fields.venueName.toLowerCase());
    if(venueId){
      // Have a hit on the venue
      const withVenueId = {
        ...fields,
        venueId
      }
      toInsert.push(withVenueId);
    } else {
      console.log(`Couldn't find matching venue ${fields.venueName}`);
      missingVenues.add(fields.venueName);
    }
  });
  missingVenues.forEach(venue => console.log(`Missing venue: ${venue}`));

  console.log(`Inserting ${toInsert.length} records`);
  // If we've already inserted some ID, we won't again.
  return await db.insert(events)
    .values(toInsert)
    .onConflictDoUpdate({
      target: events.id,
      set: {
        // This statement means that if there is a conflict on the 'id' field during the insert operation,
        // the 'startTime' field of the existing record will be updated to the value of 'startTime' from the new record being inserted.
        startTime: sql`excluded.startTime`,
        endTime: sql`excluded.endTime`
      }
    })
    .returning({ id: events.id });
}

export function extractEventFields(eventListing: EventListing) {

  // Just put artist names in a comma separated string
  const artistNames : string = eventListing.event.payload.artists.reduce((prev: string, curr :Artist) => {
    return prev + ", " + curr.data.name
  }, "");

  return {
    id: eventListing.id,
    title: eventListing.event.payload.title,
    venueName: eventListing.event.payload.venue.data.name,
    artistNames,
    startTime: DateTime.fromISO(eventListing.event.payload.startTime, { zone: 'America/New_York' }).toJSDate(),
    endTime: DateTime.fromISO(eventListing.event.payload.endTime, { zone: 'America/New_York' }).toJSDate(),
  }

}