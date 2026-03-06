import type { Response } from "express";
import { env } from "../../config/env.js";

const baseCookie = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  domain: env.COOKIE_DOMAIN || undefined,
  path: "/"
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("access_token", accessToken, {
    ...baseCookie,
    maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 * 1000
  });
  res.cookie("refresh_token", refreshToken, {
    ...baseCookie,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("access_token", baseCookie);
  res.clearCookie("refresh_token", baseCookie);
};
