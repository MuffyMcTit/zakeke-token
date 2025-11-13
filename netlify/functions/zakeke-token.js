// netlify/functions/zakeke-token.js
// New version: sends client_id and client_secret in the POST body (no Basic Auth)

export async function handler(event) {
  // CORS preflight support
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

  // If these were missing, you'd get a 500 *before* we ever talk to Zakeke
  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Missing API keys in function environment",
      }),
    };
  }

  // Build form-encoded body like the docs example:
  // grant_type=client_credentials&client_id=...&client_secret=...
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  let res;
  let text = "";

  try {
    res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    text = await res.text();

    console.info("Zakeke token response", {
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      rawText: text,
    });
  } catch (err) {
    console.error("Error calling Zakeke /token:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Network or fetch error when calling Zakeke",
        message: err.message,
      }),
    };
  }

  const contentType = res.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json") && text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Error parsing JSON from Zakeke:", e);
    }
  }

  if (!res.ok) {
    // If Zakeke returns 4xx/5xx we surface the body so support can see it
    return {
      statusCode: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Token request failed",
        status: res.status,
        contentType,
        detail: text || "",
      }),
    };
  }

  // Zakeke sometimes uses "access-token" or "access_token" depending on example
  const accessToken =
    (data && (data["access-token"] || data["access_token"])) || null;

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "access-token": accessToken,
      "expires_in": data?.expires_in ?? null,
    }),
  };
}
