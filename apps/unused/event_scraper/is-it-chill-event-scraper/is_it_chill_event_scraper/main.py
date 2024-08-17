import requests
import json
from datetime import datetime
import re


def extract_payload_from_html_regex(html):
    # Regular expression to find the <script> tag with id="__NEXT_DATA__"
    pattern = r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>'

    # Search the HTML for the pattern
    match = re.search(pattern, html, re.DOTALL)

    if match:
        # Extract the JSON data
        json_data = match.group(1)

        # Parse the JSON data into a Python dictionary
        try:
            data = json.loads(json_data)
            return data
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return None
    else:
        print("No __NEXT_DATA__ tag found")
        return None


def extract_events_from_html(html_content, target_date):
    # Extract the JSON embedded in tag <script id="__NEXT_DATA__" type="application/json">

    json_data = extract_payload_from_html_regex(html_content)

    expanded_listings = []

    if json_data:
        relevant_data = json_data["props"]["apolloState"]
        for k, v in relevant_data.items():
            if k.startswith("EventListing:"):
                try:
                    # Traverse it down
                    event_ref = v["event"]["__ref"]
                    # Find the event_ref
                    event_data = relevant_data[event_ref]
                    artists = [
                        relevant_data[artist_id["__ref"]]
                        for artist_id in event_data["artists"]
                    ]
                    # Fill in the data back into the object
                    for idx, artist in enumerate(event_data["artists"]):
                        artist["data"] = artists[idx]

                    venue_id = event_data["venue"]["__ref"]
                    venue = relevant_data[venue_id]
                    # Put the data back into the payload
                    event_data["venue"]["data"] = venue
                    # Stitch up to the top
                    v["event"]["payload"] = event_data
                    expanded_listings.append(v)
                except:
                    print("Couldn't process event")
        print("expanded_listings")
        print(len(expanded_listings))
        print(expanded_listings[:3])

    else:
        print("Could not find the __NEXT_DATA__ script tag")
        return []

    return []


def fetch_html():
    url = "https://ra.co/events/us/newyorkcity"

    headers = {
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
    }

    response = requests.get(url, headers=headers)
    return response.text


def main(html_file_path, target_date):
    html_content = fetch_html()
    # print(extract_payload_from_html_regex(html_content))

    # Extract events for the target date
    events = extract_events_from_html(html_content, target_date)


if __name__ == "__main__":
    html_file_path = "./dump.html"
    target_date = "2023-08-16"  # Format: YYYY-MM-DD
    main(html_file_path, target_date)
