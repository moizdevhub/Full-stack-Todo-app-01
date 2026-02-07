/**
 * Backend API client for AI Todo Chatbot
 * Handles all HTTP requests to the FastAPI backend
 */

import {
  ChatRequest,
  ChatResponse,
  Conversation,
  ConversationDetail,
  ConversationListResponse,
  ApiError,
} from '@/types/chat';
import { getAuthToken, getCurrentUserId } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Fetch wrapper with authentication and error handling
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const token = await getAuthToken();

  if (!token) {
    throw new ApiClientError('Not authenticated', 'UNAUTHENTICATED', 401);
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If successful, return response
      if (response.ok) {
        return response;
      }

      // Handle error responses
      const errorData: ApiError = await response.json().catch(() => ({
        error: response.statusText || 'Unknown error',
        code: 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
      }));

      throw new ApiClientError(
        errorData.error,
        errorData.code,
        response.status,
        errorData.details
      );
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error instanceof ApiClientError) {
        if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new ApiClientError('User ID not found', 'USER_ID_MISSING', 401);
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/chat/${userId}/chat`, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  return response.json();
}

/**
 * List all conversations for the current user
 */
export async function listConversations(
  limit = 20,
  offset = 0
): Promise<ConversationListResponse> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new ApiClientError('User ID not found', 'USER_ID_MISSING', 401);
  }

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetchWithAuth(`${API_BASE_URL}/chat/${userId}/conversations?${params}`);

  return response.json();
}

/**
 * Create a new conversation
 */
export async function createConversation(): Promise<Conversation> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new ApiClientError('User ID not found', 'USER_ID_MISSING', 401);
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/chat/${userId}/conversations`, {
    method: 'POST',
  });

  return response.json();
}

/**
 * Get a specific conversation with message history
 */
export async function getConversation(conversationId: number): Promise<ConversationDetail> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new ApiClientError('User ID not found', 'USER_ID_MISSING', 401);
  }

  const response = await fetchWithAuth(
    `${API_BASE_URL}/chat/${userId}/conversations/${conversationId}`
  );

  return response.json();
}

/**
 * Check API health (no authentication required)
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}
