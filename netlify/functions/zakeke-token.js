// Returns a short-lived OAuth token from Zakeke with strong error handling.

export async function handler(event) {
  // CORS (so your Squarespace page can call this)
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
      return json(500, { error: "Missing env vars ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" });
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = new URLSearchParams({ grant_type: "client_credentials" }).toString();

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text(); // read once
    let parsed;
    try {
      parsed = contentType.includes("application/json") ? JSON.parse(rawText) : null;
    } catch (e) {
      parsed = null;
    }

    // Helpful debug in Netlify function logs
    console.log("Zakeke token response:", {
      status: res.status,
      contentType,
      hasJson: !!parsed,
      rawText: contentType.includes("application/json") ? undefined : rawText?.slice(0, 300),
    });

    if (!res.ok) {
      // Surface exactly what Zakeke returned
      return json(res.status, {
        error: "Token request failed",
        status: res.status,
        contentType,
        detail: parsed || rawText || null,
      });
    }

    const access_token = parsed?.access_token || parsed?.accessToken;
    const expires_in = parsed?.expires_in;

    if (!access_token) {
      return json(500, {
        error: "Token response missing access_token",
        status: res.status,
        contentType,
        detail: parsed || rawText || null,
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "access-token": access_token,
        "expires_in": expires_in,
      }),
    };
  } catch (err) {
    console.error("Function crash:", err);
    return json(500, { error: "Function error", message: String(err?.message || err) });
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
