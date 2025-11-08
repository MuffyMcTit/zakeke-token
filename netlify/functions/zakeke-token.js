// netlify/functions/zakeke-token.js
// Gets a short-lived OAuth token from Zakeke using form-encoded body.
// This uses client_id & client_secret in the POST body (per docs).

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: "",
    };
  }

  const clientId = process.env.ZAKEKE_CLIENT_ID;
  const clientSecret = process.env.ZAKEKE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" }),
    };
  }

  // Build proper x-www-form-urlencoded body
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  // If you later need S2S tokens for server-to-server APIs, use: form.set("access_type", "S2S");
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);

  let res;
  try {
    res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Network error reaching Zakeke", detail: String(e) }),
    };
  }

  // Read response safely whether it's JSON or empty
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  const hasJson = /application\/json/i.test(contentType) || (text.startsWith("{") && text.endsWith("}"));
  const data = hasJson ? JSON.parse(text) : null;

  if (!res.ok) {
    return {
      statusCode: res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Token request failed",
        status: res.status,
        contentType,
        detail: hasJson ? data : text,
      }),
    };
  }

  // Zakeke returns: { "access-token": "...", "token_type": "Bearer", "expires_in": 3600 }
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "access-token": data["access-token"],
      "expires_in": data["expires_in"],
    }),
  };
}
