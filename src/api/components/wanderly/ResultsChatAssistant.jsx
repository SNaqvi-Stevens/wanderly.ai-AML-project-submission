import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { rankDestinations } from "@/lib/scoring";
import { DESTINATIONS } from "@/lib/destinations";

const QUICK_PROMPTS = [
  "Only show beach destinations",
  "Only options in Europe",
  "Show more budget-friendly options",
  "I want adventure / outdoor trips",
  "Somewhere warm and sunny",
  "Remove the first option",
  "Don't show any city breaks",
  "No long-haul flights",
];

// Chat flow states
const FLOW = {
  IDLE: "idle",
  ASKING_KEEP: "asking_keep", // waiting for user to select which to keep
  GENERATING: "generating",
};

export default function ResultsChatAssistant({ preferences, trips, onTripsUpdate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! Not loving one of the options? I can swap destinations, filter by region, or find a specific type of trip — all within your budget. What would you like to change?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState(FLOW.IDLE);
  const [pendingRequest, setPendingRequest] = useState(null); // the user's refinement text
  const [keepSelections, setKeepSelections] = useState(new Set()); // destination names to keep
  const [activeConstraints, setActiveConstraints] = useState([]); // accumulated user constraints
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, flow]);

  const toggleKeep = (name) => {
    setKeepSelections(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const budget = preferences?.budget || 1000;
      const currentDestinations = trips.map(t => t.destination_name).join(", ");

      // First ask the LLM if this is a "bring back" / "add" request or a broader refinement
      const intentResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a travel assistant. Classify the user's request.

Currently shown destinations: ${currentDestinations}
User request: "${msg}"

Is the user asking to ADD or BRING BACK a specific destination (without replacing everything else)?
Examples of ADD requests: "bring back Bali", "add Tokyo", "can you also show Paris", "include Lisbon"
Examples of REFINE requests: "only show beach destinations", "more budget friendly", "only Europe", "no city breaks"

Return JSON:
{
  "is_add_request": true/false,
  "destination_to_add": "exact destination name if is_add_request, else null"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            is_add_request: { type: "boolean" },
            destination_to_add: { type: "string" }
          }
        }
      });

      const intent = typeof intentResult === "string" ? JSON.parse(intentResult) : intentResult;

      if (intent.is_add_request && intent.destination_to_add) {
        // Pre-select the requested destination to keep, then go into keep-selection flow
        // so user can also pick others to keep and remaining slots get freshly regenerated
        setLoading(false);
        setPendingRequest(msg);
        const preSelected = new Set([intent.destination_to_add]);
        setKeepSelections(preSelected);
        setFlow(FLOW.ASKING_KEEP);
        setMessages(prev => [...prev, {
          role: "assistant",
          text: `Got it — I've pre-selected ${intent.destination_to_add} to keep. Want to keep any others too? Then hit Confirm and I'll fill the rest with fresh picks!`,
          type: "keep_selection"
        }]);
        return;
      }

      // It's a broader refinement — go into keep-selection flow
      setLoading(false);
      setPendingRequest(msg);
      setActiveConstraints(prev => [...prev, msg]); // accumulate constraint
      setKeepSelections(new Set());
      setFlow(FLOW.ASKING_KEEP);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Before I refresh, are there any destinations on the page right now that you'd like me to keep? Tap to select, then hit Confirm.",
        type: "keep_selection"
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again!" }]);
      setLoading(false);
    }
  };

  const handleConfirmKeep = async () => {
    setFlow(FLOW.GENERATING);
    setLoading(true);

    const kept = [...keepSelections];
    const keptLabel = kept.length > 0 ? `Keeping: ${kept.join(", ")}` : "No destinations kept.";
    setMessages(prev => [...prev, { role: "user", text: kept.length > 0 ? `Keep: ${kept.join(", ")}` : "None, refresh all" }]);

    try {
      const budget = preferences?.budget || 1000;
      const numT = preferences?.num_travelers || 1;
      const currentDestinations = trips.map(t => t.destination_name).join(", ");
      const allDestinationNames = DESTINATIONS.map(d => `${d.name} (${d.country}, ${d.region})`).join(", ");
      const slotsToFill = Math.max(1, 5 - kept.length);

      const constraintHistory = activeConstraints.length > 0
        ? `\nACTIVE CONSTRAINTS (from previous requests — must ALL be respected):\n${activeConstraints.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
        : "";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a travel assistant helping refine trip recommendations.

User's preferences:
- Budget: $${budget} total for ${numT} traveler(s)
- Interests: ${preferences?.interests?.join(", ") || "general"}
- Vibes: ${preferences?.trip_vibes?.join(", ") || "any"}
- Home airport: ${preferences?.home_airport || "unknown"}
- Min days: ${preferences?.min_days || 3}, Max days: ${preferences?.max_days || 7}
${constraintHistory}

Currently shown destinations: ${currentDestinations}
Destinations user wants to KEEP: ${kept.length > 0 ? kept.join(", ") : "none"}

User's current refinement request: "${pendingRequest}"

ALL available destinations you can pick from:
${allDestinationNames}

Instructions:
1. The user is keeping these destinations (do NOT include them in new_destinations): ${kept.length > 0 ? kept.join(", ") : "none"}
2. Pick exactly ${slotsToFill} NEW destination names from the available list that satisfy BOTH the current request AND all active constraints above.
3. Do NOT repeat any of the kept destinations.
4. All picks must reasonably fit within $${budget} budget.
5. ONLY use exact names from the available list.

Return JSON:
{
  "reply": "Brief friendly message confirming what you're doing and what's kept vs new",
  "new_destinations": ["Exactly ${slotsToFill} NEW destination names"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            reply: { type: "string" },
            new_destinations: { type: "array", items: { type: "string" } }
          }
        }
      });

      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      const newNames = parsed.new_destinations || [];

      const bigPool = rankDestinations(preferences, 200);
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      const toRecord = (name) => {
        const scored = bigPool.find(s => s.destination.name.toLowerCase() === name.toLowerCase());
        if (scored) {
          const d = scored.destination;
          const bestMonthName = monthNames[(scored.best_month || 1) - 1];
          return {
            destination_name: d.name, country: d.country, region: d.region, hero_image: d.hero_image,
            trip_length_days: scored.trip_days, total_cost_budget: scored.costs.budget,
            total_cost_comfortable: scored.costs.comfortable, total_cost_splurge: scored.costs.splurge,
            user_budget_cap: budget, season_label: scored.season_label, scores: scored.scores,
            why_we_love_this: `${d.name} perfectly matches your ${(scored.preference_matches || []).slice(0,3).join(', ')} interests with amazing ${scored.season_label?.toLowerCase()} season weather in ${bestMonthName}.`,
            preference_matches: scored.preference_matches, generation_batch: Date.now().toString(),
            preferences_id: "chat_refined", is_favorited: false,
          };
        }
        const dest = DESTINATIONS.find(d => d.name.toLowerCase() === name.toLowerCase());
        if (dest) {
          return {
            destination_name: dest.name, country: dest.country, region: dest.region, hero_image: dest.hero_image,
            trip_length_days: preferences?.min_days || 5, total_cost_budget: budget * 0.8,
            total_cost_comfortable: budget, total_cost_splurge: budget * 1.2,
            user_budget_cap: budget, season_label: "Shoulder",
            scores: { overall: 70, season: 70, budget_fit: 70, match: 70, feasibility: 70 },
            why_we_love_this: `${dest.name} is a great match for your travel style.`,
            preference_matches: [], generation_batch: Date.now().toString(),
            preferences_id: "chat_refined", is_favorited: false,
          };
        }
        return null;
      };

      // Build final list: kept trips first, then new ones
      // Also include the "bring back" destination if it's in kept but not in current trips
      const keptTrips = kept.map(name => {
        const existing = trips.find(t => t.destination_name === name);
        if (existing) return existing;
        // It's a "bring back" destination not currently shown — build it
        return toRecord(name);
      }).filter(Boolean);

      const newTrips = newNames.map(toRecord).filter(Boolean);
      // Ensure no duplicates and always 5 total
      const seen = new Set(keptTrips.map(t => t.destination_name.toLowerCase()));
      const dedupedNew = newTrips.filter(t => !seen.has(t.destination_name.toLowerCase()));
      const finalTrips = [...keptTrips, ...dedupedNew].slice(0, 5);

      // If still under 5, fill with more from the pool
      if (finalTrips.length < 5) {
        const allShown = new Set(finalTrips.map(t => t.destination_name.toLowerCase()));
        const extras = bigPool
          .filter(s => !allShown.has(s.destination.name.toLowerCase()))
          .slice(0, 5 - finalTrips.length)
          .map(s => toRecord(s.destination.name))
          .filter(Boolean);
        finalTrips.push(...extras);
      }

      if (finalTrips.length > 0) {
        onTripsUpdate(finalTrips);
        setMessages(prev => [...prev, { role: "assistant", text: parsed.reply || "Done! Updated your results." }]);
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 300);
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't find matching destinations. Try rephrasing!" }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again!" }]);
    } finally {
      setLoading(false);
      setFlow(FLOW.IDLE);
      setPendingRequest(null);
      setKeepSelections(new Set());
    }
  };

  const isAskingKeep = flow === FLOW.ASKING_KEEP;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-2.5 text-sm font-inter font-medium hover:bg-primary/90 transition-colors"
      >
        <Sparkles className="w-4 h-4" /> Refine Results
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-card rounded-2xl shadow-2xl border flex flex-col"
            style={{ maxHeight: "560px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-inter font-semibold text-sm">Refine My Trips</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm font-inter leading-relaxed ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Keep selection UI */}
              {isAskingKeep && !loading && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {trips.map((trip) => {
                      const isSelected = keepSelections.has(trip.destination_name);
                      return (
                        <button
                          key={trip.destination_name}
                          onClick={() => toggleKeep(trip.destination_name)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-inter font-medium border transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {trip.destination_name}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleConfirmKeep}
                    className="w-full mt-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-inter font-medium hover:bg-primary/90 transition-colors"
                  >
                    {keepSelections.size > 0
                      ? `Keep ${keepSelections.size} & find ${5 - keepSelections.size} new`
                      : "Refresh all 5"}
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-inter">Finding your picks...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts — only show at start */}
            {messages.length <= 1 && !loading && flow === FLOW.IDLE && (
              <div className="px-4 pb-2 flex-shrink-0">
                <p className="text-xs text-muted-foreground font-inter mb-2">Quick options:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => handleSend(p)}
                      className="text-xs font-inter px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input — only show when not in keep-selection flow */}
            {flow === FLOW.IDLE && (
              <div className="px-3 py-3 border-t flex gap-2 items-center flex-shrink-0">
                <input
                  className="flex-1 text-sm font-inter bg-secondary rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  placeholder="e.g. Only Europe, warm weather..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}