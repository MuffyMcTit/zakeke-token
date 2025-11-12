// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke.
// This version sends client_id & client_secret in the POST BODY
// (the same way your successful curl did), not via Basic Auth.

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

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const clientId = (process.env.ZAKEKE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.ZAKEKE_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Missing env vars",
        hint: "Set ZAKEKE_CLIENT_ID and ZAKEKE_CLIENT_SECRET, then redeploy.",
      }),
    };
  }

  // Build x-www-form-urlencoded body (matches your successful curl)
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  let status = 0;
  let contentType = "";
  let rawText = "";

  try {
    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    status = res.status;
    contentType = res.headers.get("content-type") || "";

    // Read text first so we can safely handle empty bodies
    rawText = await res.text();

    if (!res.ok) {
      // Pass through server details to help debugging
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token request failed",
          status,
          contentType,
          detail: rawText || "",
        }),
      };
    }

    // Parse JSON (should look like { access_token, token_type, expires_in })
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token parse failed",
          status,
          contentType,
          detail: rawText.slice(0, 2000),
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
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Function error",
        message: err?.message || String(err),
        status,
        contentType,
        detail: rawText,
      }),
    };
  }
}
