/**
 * TypeScript type definitions for AI Todo Chatbot API
 * Matches backend API contract from specs/001-ai-todo-chatbot/contracts/api.openapi.yaml
 */

/**
 * Chat request payload
 */
export interface ChatRequest {
  message: string;
  conversation_id?: number | null;
}

/**
 * MCP tool call information
 */
export interface ToolCall {
  tool: string;
  arguments: Record<string, any>;
  result: Record<string, any>;
}

/**
 * Chat response from AI assistant
 */
export interface ChatResponse {
  conversation_id: number;
  message: string;
  tool_calls: ToolCall[];
  timestamp: string;
}

/**
 * Message role type
 */
export type MessageRole = "user" | "assistant";

/**
 * Message in a conversation
 */
export interface Message {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  created_at: string;
}

/**
 * Conversation summary
 */
export interface Conversation {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

/**
 * Conversation with full message history
 */
export interface ConversationDetail extends Conversation {
  messages: Message[];
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  code: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Conversation list response
 */
export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * UI-specific message type for chat interface
 * Extends Message with optional loading states
 */
export interface ChatMessage extends Omit<Message, "id" | "conversation_id"> {
  id?: number;
  conversation_id?: number;
  isLoading?: boolean;
  error?: string;
}
