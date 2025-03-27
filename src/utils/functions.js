import crypto from 'node:crypto';

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