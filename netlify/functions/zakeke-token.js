// netlify/functions/zakeke-token.js
export async function handler(event) {
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
        body: JSON.stringify({ error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" }),
      };
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      access_type: "C2S", // be explicit for UI use
    }).toString();

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text(); // read once
    const hasJson = contentType.includes("application/json");
    const data = hasJson && rawText ? JSON.parse(rawText) : null;

    console.log("Zakeke token response:", {
      status: res.status,
      contentType,
      hasJson,
      rawText: hasJson ? undefined : rawText, // avoid logging token
    });

    if (!res.ok) {
      return {
        statusCode: 500,
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
        "access-token": data?.["access-token"],
        "expires_in": data?.expires_in,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Function error", message: String(err) }),
    };
  }
}
