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

  // helper to build responses
  const ok = (json) => ({
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
  const fail = (status, detail, contentType = "") => ({
    statusCode: 500,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify({
      error: "Token request failed",
      status,
      contentType,
      detail,
    }),
  });

  // --- Attempt 1: FORM body with client_id & client_secret (per docs) ---
  try {
    const form1 = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString();

    let res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form1,
    });

    const ct1 = res.headers.get("content-type") || "";
    const body1 = ct1.includes("application/json") ? await res.json().catch(() => null) : await res.text();

    if (res.ok && body1 && body1.access_token) {
      return ok({ "access-token": body1.access_token, "expires_in": body1.expires_in });
    }

    // --- Attempt 2: Basic Auth + grant_type only ---
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const form2 = new URLSearchParams({ grant_type: "client_credentials" }).toString();

    res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: form2,
    });

    const ct2 = res.headers.get("content-type") || "";
    const body2 = ct2.includes("application/json") ? await res.json().catch(() => null) : await res.text();

    if (res.ok && body2 && body2.access_token) {
      return ok({ "access-token": body2.access_token, "expires_in": body2.expires_in });
    }

    // If we’re still here, include whatever the server did return to help debug
    return fail(res.status, typeof body2 === "string" ? body2 : body2 || { statusText: res.statusText }, ct2);
  } catch (e) {
    return fail(0, String(e));
  }
}
