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

  const clientId = process.env.ZAKEKE_CLIENT_ID;
  const clientSecret = process.env.ZAKEKE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Server missing API keys" }),
    };
  }

  // ✅ Send client_id and client_secret in the body (not Basic auth)
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);

  let res, text = "";
  try {
    res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: form.toString(),
    });
    // read as text first so we can show something even if JSON is empty
    text = await res.text();
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Network error contacting Zakeke", detail: String(e) }),
    };
  }

  if (!res.ok) {
    // Try to parse JSON; fall back to raw text
    let detail = text;
    try { detail = JSON.parse(text); } catch {}
    return {
      statusCode: res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Token request failed",
        status: res.status,
        contentType: res.headers.get("content-type") || "",
        detail,
      }),
    };
  }

  // Success
  let data;
  try { data = JSON.parse(text); } catch {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Zakeke returned non-JSON on success", raw: text }),
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
}
