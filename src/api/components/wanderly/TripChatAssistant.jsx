import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function TripChatAssistant({ trip, tabContent, setTabContent, activeTab, preferences, onBudgetUpdate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hi! I'm your trip assistant for ${trip?.destination_name || "this trip"}. Ask me anything — best spots to visit, top restaurants, hidden gems, what to pack, or ask me to update your itinerary, fix a price, or add an activity. What would you like to know?`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      // Pass ALL current tab data as context so the AI can make smart updates
      const allContext = {
        excursions: tabContent.excursions || {},
        itinerary: tabContent.itinerary || {},
        flights: tabContent.flights || {},
        accommodations: tabContent.accommodations || {},
        restaurants: tabContent.restaurants || {},
        transport: tabContent.transport || {},
        budget: tabContent.budget || {},
      };

      const isActivityRequest = /activity|excursion|tour|visit|hike|climb|cave|kayak|museum|beach|dive|snorkel|walk|bike|boat|trip|experience/i.test(userMsg);
      const isFlightRequest = /flight|price|airline|ticket|fare|cost/i.test(userMsg);
      const isAccomRequest = /hotel|hostel|airbnb|stay|accommodation|room/i.test(userMsg);
      const isRestaurantRequest = /restaurant|food|eat|dinner|lunch|cafe|dining/i.test(userMsg);
      const isBudgetAdjust = /budget|spend|total|cap|limit|afford|increase|decrease|change.*budget|budget.*change|set.*budget/i.test(userMsg);

      const isQuestion = /\?|what|which|where|when|how|best|recommend|top|should|tell me|suggest|can you|do you|is there|are there|popular|worth|must/i.test(userMsg);
      const isExpensiveSwap = /swap|replace|change|upgrade|instead|different|more expensive|better|nicer|luxury|splurge/i.test(userMsg);
      const budgetTotal = preferences?.budget || trip?.user_budget_cap || 1000;
      const budgetWarning = isExpensiveSwap
        ? `The user is explicitly requesting to change or upgrade an activity. IGNORE budget constraints for this request — make the swap they asked for even if it costs more.`
        : `BUDGET AWARENESS: The user's total budget is $${budgetTotal}. When adding activities or making changes, try to keep the total itinerary cost within $${Math.round(budgetTotal * 1.1)}. Prefer free or low-cost alternatives unless the user explicitly asks for something more expensive.`;

      const prompt = `You are a knowledgeable travel assistant for a trip to ${trip?.destination_name}, ${trip?.country}.
Current budget: $${preferences?.budget || trip?.user_budget_cap || 1000}


User message: "${userMsg}"

Current trip data (for context):
- Excursions: ${JSON.stringify(allContext.excursions).slice(0, 1200)}
- Restaurants: ${JSON.stringify(allContext.restaurants).slice(0, 1000)}
- Itinerary: ${JSON.stringify(allContext.itinerary).slice(0, 1500)}
- Flights: ${JSON.stringify(allContext.flights).slice(0, 500)}
- Accommodations: ${JSON.stringify(allContext.accommodations).slice(0, 600)}
- Transport: ${JSON.stringify(allContext.transport).slice(0, 400)}

Determine the user's intent:
- If they are ASKING A QUESTION (recommendations, info, tips, what to do, where to eat, best spots, hotels, stays, flights, restaurants, activities, etc.): answer AND add the recommended items to the trip data. Set "is_question": true but still populate "updates" with new items to ADD.
- If they want to UPDATE/CHANGE/REMOVE something in the trip plan: make the relevant changes. Set "is_question": false.

CRITICAL RULE FOR ADDITIONS — when the user asks about or requests recommendations for hotels/stays, restaurants, activities, flights, etc.:
- Generate 1-3 new items matching what they asked for WITH realistic prices and booking info
- Return ONLY the NEW items to add in "new_items_to_add" — do NOT include existing items
- The system will automatically append these to the existing list
- NEVER replace or remove existing options unless the user explicitly says "remove" or "replace"

New item shapes:
- Accommodation: { name, type, tier_label, neighborhood, price_per_night, price_for_full_trip, star_or_guest_rating, amenities, is_best_value, booking_platform, lower_cost_note }
- Restaurant: { name, category, cuisine, price_per_person, must_try_dish, neighborhood, vibe, halal_certified, reservations_needed, budget_tip }
- Excursion: { name, category, price_per_person, duration_hours, best_time_of_day, description, difficulty, advance_booking_required, booking_platform, search_query_for_platform, is_top_pick }
- Flight: { airline, route, estimated_price_per_person, stops, total_flight_hours, best_days_to_fly, baggage_included, badge }

${budgetWarning}

Return JSON:
{
  "message": "your reply — for questions: a helpful answer describing what you found/added; for updates: brief confirmation",
  "is_question": true or false,
  "sections_updated": ["accommodations"|"restaurants"|"excursions"|"flights"|"itinerary"],
  "new_items_to_add": {
    "accommodations": [...new accommodation objects, or omit if not applicable],
    "restaurants": [...new restaurant objects, or omit if not applicable],
    "excursions": [...new excursion objects, or omit if not applicable],
    "flights": [...new flight objects, or omit if not applicable]
  },
  "new_budget": null or a number if the user is asking to change/set their total budget,
  "updates": {}
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            is_question: { type: "boolean" },
            sections_updated: { type: "array", items: { type: "string" } },
            new_items_to_add: { type: "object" },
            new_budget: { type: "number" },
            updates: { type: "object" }
          }
        }
      });

      const parsed = typeof result === "string" ? JSON.parse(result) : result;

      // Append new items to existing arrays (never replace)
      const newItems = parsed?.new_items_to_add || {};
      const SECTION_MAP = {
        accommodations: "accommodations",
        restaurants: "restaurants",
        excursions: "excursions",
        flights: "flights",
      };

      if (Object.keys(newItems).length > 0) {
        setTabContent(prev => {
          const next = { ...prev };
          for (const [section, items] of Object.entries(newItems)) {
            if (!Array.isArray(items) || items.length === 0) continue;
            const tabKey = SECTION_MAP[section];
            if (!tabKey) continue;
            const existing = next[tabKey] || {};
            const existingArr = existing[section] || [];
            next[tabKey] = { ...existing, [section]: [...existingArr, ...items] };
          }
          return next;
        });
      }

      // Handle budget update
      if (parsed?.new_budget && parsed.new_budget > 0 && onBudgetUpdate) {
        onBudgetUpdate(parsed.new_budget);
      }

      // Also apply any direct updates (explicit replacements/edits requested by user)
      if (!parsed?.is_question && parsed?.updates && Object.keys(parsed.updates).length > 0) {
        setTabContent(prev => {
          const next = { ...prev };
          for (const [key, val] of Object.entries(parsed.updates)) {
            if (val && typeof val === "object") {
              next[key] = { ...val };
            }
          }
          return next;
        });
      }

      setMessages(prev => [...prev, { role: "assistant", text: parsed?.message || "Done!" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I had trouble updating that. Please try again." }]);
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
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-2.5 text-sm font-inter font-medium hover:bg-primary/90 transition-colors"
      >
        <Sparkles className="w-4 h-4" /> Ask AI
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
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-inter font-semibold text-sm">Trip Assistant</span>
              </div>
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
                placeholder="e.g. The flight price is $450, not $600..."
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