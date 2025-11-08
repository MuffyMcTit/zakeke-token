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
      body: JSON.stringify({ error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" }),
    };
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      access_type: "C2S", // explicit client-to-server token
    }).toString();

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    // Try JSON first; fall back to text for better error messages
    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text();
    const data = contentType.includes("application/json") && rawText ? JSON.parse(rawText) : null;

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Token request failed",
          status: res.status,
          contentType,
          detail: rawText || "No response body",
          hint: "Double-check ZAKEKE_CLIENT_ID / ZAKEKE_CLIENT_SECRET in Netlify env vars.",
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
        "access-token": data?.["access-token"],
        "expires_in": data?.expires_in,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message || "Unexpected error" }),
    };
  }
}
