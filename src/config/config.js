import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || "development";

const result = dotenv.config({
  path: [`src/config/.env.${nodeEnv}`]
});

result.parsed["DELTA"] = parseFloat(result.parsed["DELTA"]);
result.parsed["WALLET_INCREMENT"] = parseFloat(result.parsed["WALLET_INCREMENT"]);
result.parsed["STRATEGYTYPE"] = parseInt(result.parsed["STRATEGYTYPE"]);

export const {
  HMAC_SHA_256_API_KEY,
  HMAC_SHA_256_SECRET_KEY,
  ED25519_API_KEY,
  ED25519_PUBLIC_KEY,
  ED25519_PRIVATE_KEY,
  REST_API_ENDPOINT,
  WEBSOCKET_API_ENDPOINT,
  WEBSOCKET_STREAM_ENDPOINT,
  USER_DATA_STREAM,
  WEB_APP_URL,
  SYMBOL_BASE,
  SYMBOL_QUOTE,
  DELTA,
  WALLET_INCREMENT,
  STRATEGYTYPE
} = result.parsed;
