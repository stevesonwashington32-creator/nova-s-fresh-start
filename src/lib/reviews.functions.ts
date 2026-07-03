import { createServerFn } from "@tanstack/react-start";

const PLACE_ID = "ChIJf0Uu0abzQxARuLEWU92gD6I"; // Nova Restaurant and Bar
const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30 * 5; // ~5 months
const MAX_TEXT_LEN = 240;

export type PlaceReview = {
  author: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
};

export type PlaceReviewsResult = {
  rating: number;
  userRatingCount: number;
  reviews: PlaceReview[];
};

export const getPlaceReviews = createServerFn({ method: "GET" }).handler(async (): Promise<PlaceReviewsResult> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) {
    return { rating: 0, userRatingCount: 0, reviews: [] };
  }

  const res = await fetch(`${GATEWAY}/places/v1/places/${PLACE_ID}?reviews_sort=NEWEST`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews",
    },
  });

  if (!res.ok) {
    return { rating: 0, userRatingCount: 0, reviews: [] };
  }

  const data = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    reviews?: Array<{
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
      authorAttribution?: { displayName?: string; photoUri?: string };
    }>;
  };

  const now = Date.now();
  const all: PlaceReview[] = (data.reviews ?? [])
    .map((r) => {
      const raw = (r.text?.text ?? r.originalText?.text ?? "").trim();
      const text = raw.length > MAX_TEXT_LEN ? raw.slice(0, MAX_TEXT_LEN - 1).trimEnd() + "…" : raw;
      return {
        author: r.authorAttribution?.displayName ?? "Guest",
        authorPhoto: r.authorAttribution?.photoUri ?? null,
        rating: r.rating ?? 5,
        text,
        relativeTime: r.relativePublishTimeDescription ?? "",
        publishTime: r.publishTime ?? "",
      };
    })
    .filter((r) => r.text.length > 0);

  const recent = all.filter((r) => {
    if (!r.publishTime) return false;
    const ts = Date.parse(r.publishTime);
    if (Number.isNaN(ts)) return false;
    return now - ts <= MAX_AGE_MS;
  });

  // Prefer recent reviews; fall back to all if the 5-month window is empty.
  const reviews = (recent.length ? recent : all).slice(0, 8);


  return {
    rating: data.rating ?? 0,
    userRatingCount: data.userRatingCount ?? 0,
    reviews,
  };
});
