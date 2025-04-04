import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || "development";

const result = dotenv.config({
  path: [`src/config/.env.${nodeEnv}`]
});

export const {
  HMAC_SHA_256_API_KEY,
  HMAC_SHA_256_SECRET_KEY,
  ED25519_API_KEY,
  ED25519_PUBLIC_KEY,
  ED25519_PRIVATE_KEY,
  REST_API_ENDPOINT,
  WEBSOCKET_API_ENDPOINT,
  WEBSOCKET_STREAM_ENDPOINT,
  USER_DATA_STREAM
} = result.parsed;
