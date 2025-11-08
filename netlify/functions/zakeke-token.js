// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke.
// Reads ZAKEKE_CLIENT_ID and ZAKEKE_CLIENT_SECRET from Netlify env vars.

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
    return json(500, { error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "client_credentials" }).toString();

  // Call Zakeke token endpoint (client-credentials flow)
  // Docs: POST https://api.zakeke.com/token  (x-www-form-urlencoded)
  // Returns: { "access-token": "...", "token_type": "Bearer", "expires_in": 3600 }
  // (default token type is C2S; if you ever need S2S, include access_type=S2S)  :contentReference[oaicite:3]{index=3}
  const res = await fetch("https://api.zakeke.com/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  // Safely read the response (may be empty on some errors)
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();
  const data = raw && contentType.includes("application/json") ? safeJson(raw) : raw;

  if (!res.ok) {
    return json(res.status, {
      error: "Token request failed",
      status: res.status,
      contentType,
      detail: raw ? data : "No response body",
      hint: "Double-check ZAKEKE_CLIENT_ID / ZAKEKE_CLIENT_SECRET in Netlify env vars.",
    });
  }

  const accessToken = data && data["access-token"]; // <-- hyphen key per docs
  const expiresIn = data && data["expires_in"];

  if (!accessToken) {
    return json(500, {
      error: "Token missing in response",
      detail: data || raw || null,
    });
  }

  return json(200, {
    "access-token": accessToken,
    "expires_in": expiresIn,
  });
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj),
  };
}
