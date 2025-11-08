// netlify/functions/zakeke-token.js
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
      body: JSON.stringify({
        error: "Missing env",
        hint: "Set ZAKEKE_CLIENT_ID and ZAKEKE_CLIENT_SECRET in Netlify → Site settings → Environment variables",
      }),
    };
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "client_credentials" }).toString();

  let res, text, data;
  try {
    res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body,
    });

    // Read raw text first (some servers send empty/HTML bodies on error)
    text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Network error contacting Zakeke", detail: String(e) }),
    };
  }

  if (!res.ok) {
    return {
      statusCode: res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Token request failed",
        status: res.status,
        contentType: res.headers.get("content-type") || "",
        detail: data || (text || "No response body"),
        hint: "Double-check ZAKEKE_CLIENT_ID / ZAKEKE_CLIENT_SECRET in Netlify env vars.",
      }),
    };
  }

  // Success
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "access-token": data?.access_token,
      "expires_in": data?.expires_in,
    }),
  };
}
