// Amount: Rs. or INR followed by number with optional commas and decimals
export const AMOUNT_PATTERN = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/gi

// Datetime patterns ordered by specificity (most specific first)
// ISO: 2024-01-15 14:30:00
export const ISO_DATETIME = /\b(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\b/

// Pluxee: 15-01-2024 14:30:00 (DD-MM-YYYY HH:MM:SS)
export const PLUXEE_DATETIME = /\b(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})\b/

// Indian short: 15-Jan-24
export const INDIAN_DATE = /\b(\d{2}-[A-Za-z]{3}-\d{2})\b/

// Slash: 15/01/24
export const SLASH_DATE = /\b(\d{2}\/\d{2}\/\d{2})\b/
