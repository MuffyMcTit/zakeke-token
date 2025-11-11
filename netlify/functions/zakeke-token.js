// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke, using FORM FIELDS
// (client_id & client_secret in the body) instead of Basic auth.

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

  try {
    const form = new URLSearchParams();
    form.set("grant_type", "client_credentials");
    form.set("client_id", clientId);
    form.set("client_secret", clientSecret);

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: form.toString(),
    });

    const rawText = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const hasJson = contentType.includes("application/json");
    const data = hasJson && rawText ? JSON.parse(rawText) : null;

    // Helpful logs visible in Netlify → Functions → Logs
    console.log("Zakeke token response:", {
      status: res.status,
      contentType,
      hasJson,
      rawText: hasJson ? undefined : rawText, // avoid logging tokens
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token request failed",
          status: res.status,
          contentType,
          detail: hasJson ? data : rawText || "",
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
    console.error("Token function crash:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Function error", message: String(err?.message || err) }),
    };
  }
}
