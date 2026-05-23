// lib/authVerify.js
// Server-side helper to verify client Firebase ID tokens.
// Uses the lightweight Firebase REST API. No service account key file required.

export async function verifyAuthToken(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[authVerify] Missing or invalid authorization header prefix');
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      console.warn('[authVerify] Empty bearer token received');
      return null;
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error('[authVerify] Firebase API key not configured on server');
      return null;
    }

    // Call Firebase Auth REST API to lookup user/verify token
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error(
        `[authVerify] Token validation failed with status ${res.status}:`,
        errorData.error?.message || 'Unknown error'
      );
      return null;
    }

    const data = await res.json();
    const user = data.users?.[0];

    if (!user) {
      console.warn('[authVerify] No user matching token found');
      return null;
    }

    return user;
  } catch (error) {
    console.error('[authVerify] Unexpected error in token verification:', error);
    return null;
  }
}
