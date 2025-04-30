import crypto from 'node:crypto';
import axios from "axios";
import { SYMBOL_BASE, SYMBOL_QUOTE } from '../config/config.js';

export const signature_HMAC_SHA_256 = (queryString, HMAC_SHA_256_SECRET_KEY) =>
  crypto.createHmac('sha256', HMAC_SHA_256_SECRET_KEY)
    .update(queryString)
    .digest('hex');

export const signature_ED25519 = (query_string, ED25519_PRIVATE_KEY) => {
  // Creiamo una chiave privata utilizzabile per la firma
  // Nota: il formato della chiave potrebbe dover essere adattato in base 
  // al formato in cui è memorizzata PRIVATE_KEY
  const signingKey = crypto.createPrivateKey({
    key: ED25519_PRIVATE_KEY,
    format: 'pem',  // Adatta questo in base al formato della tua chiave
    type: 'pkcs8'
  });

  // Firmiamo la query string
  return crypto.sign(
    null,  // Ed25519 non richiede di specificare l'algoritmo di hash
    Buffer.from(query_string),
    signingKey
  ).toString('base64');
};

export const sessionLogon = (ED25519_API_KEY, ED25519_PRIVATE_KEY) => {
  const params = {
    apiKey: ED25519_API_KEY,
    timestamp: Date.now()
  };
  const searchParams = new URLSearchParams({ ...params });
  searchParams.sort();
  searchParams.append("signature", signature_ED25519(searchParams.toString(), ED25519_PRIVATE_KEY));

  return JSON.stringify({
    id: "session_logon",
    method: "session.logon",
    params: Object.fromEntries(searchParams)
  });
};

export const getLastTrade = async (WEB_APP_URL) => {
  const response = await axios.get(WEB_APP_URL);

  const last_trade = {
    side: response.data[0],
    time: response.data[1],
    id: response.data[2],
    price: response.data[3],
    price_executed: response.data[4],
    wallet_target: response.data[5], // Set initial value
    base_required: response.data[6],
    base_to_buy: response.data[7],
    base_to_buy_fee: response.data[8],
    base_owned: response.data[9], // Set initial value
    quote_spent: response.data[10],
    quote_spent_fee: response.data[11],
    quote_spent_sum: response.data[12], // Set initial value
    buffer: response.data[13] // Set initial value
  };

  return last_trade;
};

export const saveTrade = async (WEB_APP_URL, data) => {
  const response = await axios.post(WEB_APP_URL, data);

  return response;
};

export const getSymbol = () => ({
  base: SYMBOL_BASE,
  quote: SYMBOL_QUOTE
});
