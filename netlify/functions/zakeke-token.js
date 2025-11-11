// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke using BODY credentials.
// Matches your working curl test.

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
      body: JSON.stringify({ error: "Missing env vars" }),
    };
  }

  // IMPORTANT: send client_id and client_secret in the body (no Basic auth header)
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://api.zakeke.com/token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const contentType = res.headers.get("content-type") || "";
  const hasJson = contentType.includes("application/json");
  const rawText = hasJson ? "" : await res.text().catch(() => "");

  if (!res.ok) {
    const detail = hasJson ? await res.json().catch(() => ({})) : rawText;
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Token request failed",
        status: res.status,
        contentType,
        detail,
      }),
    };
  }

  const data = hasJson ? await res.json() : {};
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "access-token": data.access_token,
      "expires_in": data.expires_in,
    }),
  };
}
