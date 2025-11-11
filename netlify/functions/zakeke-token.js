// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke using BODY credentials (like your curl).

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

  try {
    const clientId = process.env.ZAKEKE_CLIENT_ID;
    const clientSecret = process.env.ZAKEKE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing env vars ZAKEKE_CLIENT_ID / ZAKEKE_CLIENT_SECRET" }),
      };
    }

    // ✅ Match your working curl: send creds in the form body (no Basic auth header)
    const form = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString();

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body: form,
    });

    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text();
    const hasJson = contentType.includes("application/json");
    const data = hasJson ? JSON.parse(rawText) : null;

    console.log("Zakeke token response:", {
      status: res.status,
      contentType,
      hasJson,
      rawText: hasJson ? "[json]" : rawText?.slice(0, 200) || "",
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token request failed",
          status: res.status,
          contentType,
          detail: hasJson ? data : rawText,
        }),
      };
    }

    if (!data?.access_token) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token JSON missing access_token",
          detail: hasJson ? data : rawText,
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
        "expires_in": data.expires_in ?? 3600,
      }),
    };
  } catch (err) {
    console.error("Token function crash:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Unhandled error", detail: String(err?.message || err) }),
    };
  }
}
