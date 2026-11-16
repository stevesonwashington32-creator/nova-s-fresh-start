import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getSiteOrigin = createServerFn({ method: "GET" }).handler(() => {
  const request = getRequest();
  const url = new URL(request.url);
  const forwardedHost = url.hostname === "localhost"
    ? request.headers.get("x-forwarded-host")
    : null;

  return forwardedHost ? `https://${forwardedHost}` : url.origin;
});