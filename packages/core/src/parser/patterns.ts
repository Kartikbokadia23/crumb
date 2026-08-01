// Amount: Rs. or INR followed by number with optional commas and decimals
export const AMOUNT_PATTERN = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/gi

// Datetime patterns ordered by specificity (most specific first)
// ISO: 2024-01-15 14:30:00, also "2026-08-01T11:22:47" and HDFC's "2026-08-01:11:22:47"
export const ISO_DATETIME = /\b(\d{4}-\d{2}-\d{2})[\sT:](\d{2}:\d{2}:\d{2})\b/

// Pluxee: 15-01-2024 14:30:00 (DD-MM-YYYY HH:MM:SS)
export const PLUXEE_DATETIME = /\b(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})\b/

// Indian short: 15-Jan-24
export const INDIAN_DATE = /\b(\d{2}-[A-Za-z]{3}-\d{2})\b/

// Slash: 15/01/24
export const SLASH_DATE = /\b(\d{2}\/\d{2}\/\d{2})\b/

// Dash numeric: 29-07-26 (DD-MM-YY, no time, used by Kotak and similar)
export const DASH_DATE = /\bon\s+(\d{2}-\d{2}-\d{2})\b/i
