import { createServerFn } from "@tanstack/react-start";

const PLACE_ID = "ChIJf0Uu0abzQxARuLEWU92gD6I"; // Nova Restaurant and Bar
const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

export type PlaceReview = {
  author: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  photoUri: string | null;
};

export type PlaceReviewsResult = {
  rating: number;
  userRatingCount: number;
  reviews: PlaceReview[];
};

async function resolvePhoto(name: string, apiKey: string, lovableKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GATEWAY}/v1/${name}/media?maxWidthPx=1600&skipHttpRedirect=true`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": apiKey,
        },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { photoUri?: string };
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}

export const getPlaceReviews = createServerFn({ method: "GET" }).handler(async (): Promise<PlaceReviewsResult> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) {
    return { rating: 0, userRatingCount: 0, reviews: [] };
  }

  const res = await fetch(`${GATEWAY}/places/v1/places/${PLACE_ID}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews,photos",
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
      authorAttribution?: { displayName?: string; photoUri?: string };
    }>;
    photos?: Array<{ name: string }>;
  };

  const photos = data.photos ?? [];
  const photoNames = photos.slice(0, 8).map((p) => p.name);
  const resolved = await Promise.all(photoNames.map((n) => resolvePhoto(n, apiKey, lovableKey)));
  const photoUris = resolved.filter((u): u is string => Boolean(u));

  const reviews: PlaceReview[] = (data.reviews ?? []).slice(0, 8).map((r, i) => ({
    author: r.authorAttribution?.displayName ?? "Guest",
    authorPhoto: r.authorAttribution?.photoUri ?? null,
    rating: r.rating ?? 5,
    text: r.text?.text ?? r.originalText?.text ?? "",
    relativeTime: r.relativePublishTimeDescription ?? "",
    photoUri: photoUris[i % (photoUris.length || 1)] ?? photoUris[0] ?? null,
  }));

  return {
    rating: data.rating ?? 0,
    userRatingCount: data.userRatingCount ?? 0,
    reviews,
  };
});
