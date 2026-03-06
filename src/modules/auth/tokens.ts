import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export type AccessPayload = {
  sub: string;
  email: string;
};

export const signAccessToken = (payload: AccessPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m` });

export const signRefreshToken = (payload: AccessPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });

export const verifyAccessToken = (token: string) => jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;

export const verifyRefreshToken = (token: string) => jwt.verify(token, env.JWT_REFRESH_SECRET) as AccessPayload;
