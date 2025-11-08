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
        error: "Missing credentials",
        hint: "Add ZAKEKE_CLIENT_ID and ZAKEKE_CLIENT_SECRET in Site settings → Environment variables, then redeploy.",
      }),
    };
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const form = new URLSearchParams({ grant_type: "client_credentials" });

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const contentType = res.headers.get("content-type") || "";

    // Read body safely as text first
    const raw = await res.text();
    let json = null;
    if (raw && contentType.includes("application/json")) {
      try { json = JSON.parse(raw); } catch (_) { /* ignore */ }
    }

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token request failed",
          status: res.status,
          contentType,
          detail: raw || "No response body",
          hint: "Double-check ZAKEKE_CLIENT_ID / ZAKEKE_CLIENT_SECRET (no extra spaces/period) and that they were saved before redeploy.",
        }),
      };
    }

    const accessToken = json?.access_token || (json && json.accessToken);
    const expiresIn = json?.expires_in || 3600;

    if (!accessToken) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token missing in response",
          detail: raw || "Empty response",
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
        "access-token": accessToken,
        "expires_in": expiresIn,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Function error",
        message: String(err?.message || err),
      }),
    };
  }
}
