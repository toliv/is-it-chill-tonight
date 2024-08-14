export const COOKIE_NAME = `userVenueSurveys`;

export function readCookie(): Record<string, string> {
  const cookieName = `userVenueSurveys`;
  const lastSubmission = document.cookie.split('; ').find(row => row.startsWith(`${cookieName}=`));
  if(lastSubmission){
    // Some b64 strings can contain equal signs, so just split it based on the exact cookie name
    const c = lastSubmission.split(`${cookieName}=`);
    const jsonString = c[1] ? atob(c[1]) : '';
    // 3. Parse the JSON string back into an object
    const jsonObject = JSON.parse(jsonString);
    return jsonObject;
  }
  return {};
}

export function clearCookie() {
  const cookieName = `userVenueSurveys`;
  document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function markVenueAsSurveyed(venueName: string){
  const cookieName = `userVenueSurveys`;
  let existingValue = readCookie();
  existingValue[venueName] = new Date().toISOString();
  const base64Encoded = btoa(JSON.stringify(existingValue));
  // Max age is 12 hours
  document.cookie = `${cookieName}=${base64Encoded}; path=/; max-age=43200`;
}

export function hasSubmittedRecently(venueName?: string ) {
  if(!venueName){
    return false;
  }
  const c = readCookie();
  if (venueName in c) {
    return true;
  }
  return false;
}

export function latestSubmissionTimeFromCookie(){
  const cookieData = readCookie();
  if (Object.keys(cookieData).length === 0) {
    return null;
  }

  const dates = Object.values(cookieData).map(dateString => new Date(dateString));
  return new Date(Math.max(...dates.map(date => date.getTime())));
}

export function getReviewedTimeFromCookie(venueName: string){
  const cookieData = readCookie();
  if(cookieData){
    return cookieData[venueName] ? new Date(cookieData[venueName]) : null;
  }
  return null;
}