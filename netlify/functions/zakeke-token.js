// netlify/functions/zakeke-token.js
// Gets a Zakeke OAuth token using client_id & client_secret in the BODY (not Basic Auth).
// Also requests JSON explicitly and returns improved error diagnostics.

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

  // Build body with form-encoded credentials (per Zakeke docs)
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  // If you ever need S2S tokens for server-to-server endpoints, uncomment:
  // form.set("access_type", "S2S");

  let res;
  try {
    res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",                 // important
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } catch (networkErr) {
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Network error reaching Zakeke",
        detail: String(networkErr),
      }),
    };
  }

  const contentType = res.headers.get("content-type") || "";
  let text = "";
  try { text = await res.text(); } catch (_) {}

  if (!res.ok) {
    // Try to parse JSON error if present
    let jsonDetail = null;
    if (contentType.includes("application/json") && text) {
      try { jsonDetail = JSON.parse(text); } catch {}
    }
    return {
      statusCode: res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Token request failed",
        status: res.status,
        contentType,
        detail: jsonDetail || text || "No response body",
      }),
    };
  }

  // Success: parse JSON and pass through access-token
  let data;
  try {
    data = JSON.parse(text);
  } catch (parseErr) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Invalid JSON from Zakeke",
        detail: text.slice(0, 200),
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
      "access-token": data["access-token"],
      "expires_in": data["expires_in"],
      "token_type": data["token_type"],
    }),
  };
}
