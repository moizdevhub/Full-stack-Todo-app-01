/**
 * Authentication service for AI Todo Chatbot
 * Handles JWT token management using localStorage (same as todo app)
 */

/**
 * Get the current JWT token from localStorage
 * @returns JWT token string or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // Get token from localStorage (same as todo app)
    const token = localStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Extract user_id from JWT token
 * @param token JWT token string
 * @returns User UUID from sub claim or null if invalid
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Extract user_id from sub claim
    return payload.sub || null;
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Get the current authenticated user's ID
 * @returns User UUID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    // Get user from localStorage (same as todo app)
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return null;
    }

    const user = JSON.parse(userStr);
    return user.id || null;
  } catch (error) {
    console.error('Failed to get current user ID:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns true if user has valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Failed to sign out:', error);
  }
}
