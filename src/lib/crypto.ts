import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { env } from "../config/env.js";

export const hashPassword = (plain: string) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);

export const comparePassword = (plain: string, hashed: string) => bcrypt.compare(plain, hashed);

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export const randomToken = () => crypto.randomBytes(32).toString("hex");
