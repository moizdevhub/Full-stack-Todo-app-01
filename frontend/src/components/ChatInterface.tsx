/**
 * ChatInterface component
 * Main chat interface integrating MessageList and InputBox
 * Manages conversation state and API communication
 */

'use client';

import { useState, useCallback } from 'react';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { ChatMessage } from '@/types/chat';
import { sendChatMessage, ApiClientError } from '@/services/api';

interface ChatInterfaceProps {
  conversationId?: number | null;
  initialMessages?: ChatMessage[];
  onConversationCreated?: (conversationId: number) => void;
  onMessageSent?: () => void;
}

export default function ChatInterface({
  conversationId: initialConversationId,
  initialMessages = [],
  onConversationCreated,
  onMessageSent,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<number | null>(
    initialConversationId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = useCallback(
    async (messageContent: string) => {
      // Clear any previous errors
      setError(null);

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: messageContent,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Send message to backend
        const response = await sendChatMessage({
          message: messageContent,
          conversation_id: conversationId,
        });

        // Update conversation ID if this is a new conversation
        if (!conversationId && response.conversation_id) {
          setConversationId(response.conversation_id);
          onConversationCreated?.(response.conversation_id);
        }

        // Add assistant response to UI
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          created_at: response.timestamp,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Notify parent component that a message was sent (for data sync)
        onMessageSent?.();
      } catch (err) {
        console.error('Failed to send message:', err);

        let errorMessage = 'Failed to send message. Please try again.';

        if (err instanceof ApiClientError) {
          if (err.code === 'UNAUTHENTICATED') {
            errorMessage = 'You need to sign in to use the chat.';
          } else if (err.code === 'FORBIDDEN') {
            errorMessage = 'You do not have permission to access this conversation.';
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);

        // Add error message to UI
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
          error: errorMessage,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, onConversationCreated, onMessageSent]
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">AI Todo Assistant</h1>
        <p className="text-sm text-gray-500">
          Manage your tasks with natural language
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <InputBox
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder="Ask me to add tasks, view your list, or manage your todos..."
      />
    </div>
  );
}
