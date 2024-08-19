import {Artist, EventListing} from "./fetchEvents";
import { db } from "../../server/db";
import { events, venues,surveys } from "../../server/db/schema";
import { count, sql } from "drizzle-orm";

export async function syncEventDatabase(eventListings: EventListing[]){
  console.log("syncing")
  // Bring venues into memory bc small size
  const allSurveys = await db.select().from(surveys);
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
    console.log("startTime")
    console.log(fields.startTime)
    console.log(typeof fields.startTime);
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
  return await db.insert(events).values(toInsert).onConflictDoNothing().returning({id: events.id});
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
    startTime: new Date(eventListing.event.payload.startTime),
    endTime: new Date(eventListing.event.payload.endTime),
  }

}