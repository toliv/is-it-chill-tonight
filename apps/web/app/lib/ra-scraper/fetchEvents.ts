export interface Artist {
  __ref: string;
  data?: any;
}

interface Venue {
  __ref: string;
  data?: any;
}

interface EventData {
  artists: Artist[];
  venue: Venue;
  title: string;
  startTime: string;
  endTime:string;
}

export interface EventListing {
  id: string;
  event: {
    __ref: string;
    payload: EventData;
  };
}

function extractPayloadFromHtmlRegex(html: string): any | null {
  const pattern = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
  const match = html.match(pattern);

  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error(`Error parsing JSON: ${e}`);
      return null;
    }
  } else {
    console.log("No __NEXT_DATA__ tag found");
    return null;
  }
}

function extractEventsFromHtml(htmlContent: string): EventListing[] {
  const jsonData = extractPayloadFromHtmlRegex(htmlContent);
  const expandedListings: EventListing[] = [];

  if (jsonData) {
    const relevantData = jsonData.props.apolloState;
    for (const [k, v] of Object.entries(relevantData)) {
      if (k.startsWith("EventListing:")) {
        try {
          const eventListing = v as EventListing;
          const eventRef = eventListing.event.__ref;
          const eventData = relevantData[eventRef] as EventData;

          const artists = eventData.artists.map(artist => relevantData[artist.__ref]);

          // Fill in the data back into the object
          eventData.artists.forEach((artist, idx) => {
            artist.data = artists[idx];
          });

          const venueId = eventData.venue.__ref;
          const venue = relevantData[venueId];
          
          // Put the data back into the payload
          eventData.venue.data = venue;
          
          // Stitch up to the top
          eventListing.event.payload = eventData;
          expandedListings.push(eventListing);
        } catch (error) {
          console.log("Couldn't process event");
        }
      }
    }
    // console.log("expanded_listings");
    // console.log(expandedListings.length);
    // console.log(expandedListings.slice(0, 3));
  } else {
    console.log("Could not find the __NEXT_DATA__ script tag");
  }

  return expandedListings;
}

async function fetchHtml(): Promise<string> {
  const url = "https://ra.co/events/us/newyorkcity";

  const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "max-age=0",
    "cookie": "sid=501c87b3-f988-4a96-86eb-96cebf29d137; datadome=sza8StuRdFwQyGlHktFJ61xaDDN6ulJtt_~ZT4SBKaXKSqM9wObCe_ws1K1g0nSzl6sveMgvnRMN2bqY1NP4wg3UBTnlJEuwkQDII3PBqVjoUqV~m2229bGTg6xCYlag; ra_content_language=en; ravelinDeviceId=rjs-00ad688f-62e2-446e-9863-8d474d20c625; ravelinSessionId=rjs-00ad688f-62e2-446e-9863-8d474d20c625:810cf090-200b-4083-bdd9-4d239fc69c97",
    "dnt": "1",
    "priority": "u=0, i",
    "sec-ch-device-memory": "8",
    "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
    "sec-ch-ua-arch": '"arm"',
    "sec-ch-ua-full-version-list": '"Chromium";v="127.0.6533.120", "Not)A;Brand";v="99.0.0.0"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  };

  const response = await fetch(url, { headers });
  const data = await response.text();
  return data;
}

export async function fetchEvents(): Promise<EventListing[]> {
  const htmlContent = await fetchHtml();
  // console.log(extractPayloadFromHtmlRegex(htmlContent));

  // Extract events for the target date
  const events = extractEventsFromHtml(htmlContent);
  return events;
}
