import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function ProfileChatAssistant({ userPrefs }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    if (userPrefs?.id) {
      const stored = localStorage.getItem(`chat-${userPrefs.id}`);
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch {
          setMessages([{ role: "assistant", text: "Hi! Ask me anything about your travel preferences or trip planning." }]);
        }
      } else {
        setMessages([{ role: "assistant", text: "Hi! Ask me anything about your travel preferences or trip planning." }]);
      }
    }
  }, [userPrefs?.id]);

  // Scroll to bottom
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Save chat history to localStorage
  useEffect(() => {
    if (userPrefs?.id && messages.length > 1) {
      localStorage.setItem(`chat-${userPrefs.id}`, JSON.stringify(messages));
    }
  }, [messages, userPrefs?.id]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const prompt = `You are a helpful travel assistant for profile settings and trip planning. 
User preferences: 
- Name: ${userPrefs?.first_name || 'Traveler'}
- Home: ${userPrefs?.home_city || userPrefs?.home_airport || 'Not set'}
- Interests: ${userPrefs?.interests?.join(', ') || 'None specified'}
- Dietary: ${userPrefs?.dietary?.join(', ') || 'No restrictions'}

User message: "${userMsg}"

Provide a helpful, conversational response.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
      });

      setMessages(prev => [...prev, { role: "assistant", text: typeof result === "string" ? result : result.message || "Done!" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I had trouble responding. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-2.5 text-sm font-inter font-medium hover:bg-primary/90 transition-colors"
      >
        <MessageCircle className="w-4 h-4" /> Ask AI
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-card rounded-2xl shadow-2xl border flex flex-col"
            style={{ maxHeight: "480px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5 rounded-t-2xl">
              <span className="font-inter font-semibold text-sm">Profile Assistant</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm font-inter leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t flex gap-2 items-center">
              <input
                className="flex-1 text-sm font-inter bg-secondary rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                placeholder="Ask about your profile..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}