const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is not set. Add it to frontend/.env.local.");
}

export const API_BASE_URL = apiBaseUrl;
