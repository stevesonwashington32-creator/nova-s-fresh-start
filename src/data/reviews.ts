import reviewsData from "./reviews.json";

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

export const placeReviews: PlaceReviewsResult = reviewsData as PlaceReviewsResult;
