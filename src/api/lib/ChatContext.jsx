import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [pageContext, setPageContext] = useState("");
  const [userId, setUserId] = useState(null);

  // Get current user on mount
  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) setUserId(user.id);
    }).catch(() => {
      // User not authenticated
    });
  }, []);

  // Load chat history on mount (user-scoped)
  useEffect(() => {
    if (!userId) return;
    const storageKey = `global-chat-${userId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {
        setMessages([]);
      }
    }
  }, [userId]);

  // Save chat history (user-scoped)
  useEffect(() => {
    if (!userId || messages.length === 0) return;
    const storageKey = `global-chat-${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, userId]);

  return (
    <ChatContext.Provider value={{ messages, setMessages, pageContext, setPageContext }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}