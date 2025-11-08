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

  let clientId = (process.env.ZAKEKE_CLIENT_ID || "").trim();
  let clientSecret = (process.env.ZAKEKE_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    return json(500, { error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" });
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = new URLSearchParams({ grant_type: "client_credentials" }).toString();

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body,
    });

    const contentType = res.headers.get("content-type") || "";
    let data = null;

    // Zakeke should return JSON; if not, avoid JSON.parse crash
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      // Try text so we can surface statusText/body when things go wrong
      const text = await res.text();
      if (!res.ok) {
        return json(res.status, {
          error: "Token request failed",
          status: res.status,
          contentType,
          detail: text || res.statusText,
          hint: "Check Client ID/Secret, headers, and that env vars are approved.",
        });
      }
      // Unexpected but OK
      return json(200, { "access-token": text, note: "Non-JSON token response" });
    }

    if (!res.ok) {
      return json(res.status, {
        error: "Token request failed",
        status: res.status,
        detail: data,
        hint: "Verify credentials and ensure no extra whitespace.",
      });
    }

    // Happy path
    return json(200, {
      "access-token": data["access-token"] || data.access_token,
      "expires_in": data.expires_in,
    });
  } catch (err) {
    return json(500, { error: "Function error", message: String(err) });
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj),
  };
}
