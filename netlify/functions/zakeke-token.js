// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke with detailed error info.

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
        detail: "ZAKEKE_CLIENT_ID and/or ZAKEKE_CLIENT_SECRET are not set",
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
    const text = await res.text(); // read raw first for better diagnostics

    if (!res.ok) {
      const debug = {
    status: res.status,
    contentType,
    text: text || null,
    json: data || null
  };

  return {
    statusCode: res.status || 500,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      error: "Token request failed",
      debug,
      hint: "Your Client ID / Secret were received by Netlify, but Zakeke rejected them. That means formatting or whitespace is still off."
    })
  };
    }

    // Success: parse JSON body into our smaller payload
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Unexpected non-JSON token response",
          status: res.status,
          contentType,
          detail: text,
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
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Function error", message: String(err) }),
    };
  }
}
