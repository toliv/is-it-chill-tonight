/**
 * Checks if the given date is between 8 PM and 4 AM Eastern Time.
 * @param date The date to check.
 * @returns True if the date is between 8 PM and 4 AM ET, false otherwise.
 */
export function isBetween8PMand4AMET(date: Date): boolean {
  // Create a new date object in the Eastern Time zone
  const etDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  const hours = etDate.getHours();
  
  // Check if the time is between 8 PM (20:00) and 11:59 PM
  // or between 12 AM (00:00) and 3:59 AM (03:59)
  return (hours >= 20 || hours < 4);
}

/**
 * Formats a given date as "Month Day Year" and adjusts for early morning hours.
 * @param date The date to format.
 * @returns A string representing the formatted date.
 */
export function formatDateWithEarlyMorningAdjustment(date: Date): string {
  // Create a new Date object to avoid modifying the original
  const adjustedDate = new Date(date);

  // If it's before 6 AM, subtract one day
  if (adjustedDate.getHours() < 6) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
  }

  // Format the date
  return adjustedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
