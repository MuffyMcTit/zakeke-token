// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke using BODY credentials
// (grant_type=client_credentials&client_id=...&client_secret=...)

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
        error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET",
      }),
    };
  }

  // Build the body exactly like the working curl:
  // -d "grant_type=client_credentials&client_id=...&client_secret=..."
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  let res;
  try {
    res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body,
    });
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Network error calling Zakeke",
        detail: String(err),
      }),
    };
  }

  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();
  let data = null;

  if (contentType.includes("application/json") && rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      // leave data = null, we'll expose rawText below
    }
  }

  if (!res.ok) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Token request failed",
        status: res.status,
        contentType,
        detail: data || rawText,
      }),
    };
  }

  if (!data || !data.access_token) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "No access_token in Zakeke response",
        status: res.status,
        contentType,
        detail: rawText,
      }),
    };
  }

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
