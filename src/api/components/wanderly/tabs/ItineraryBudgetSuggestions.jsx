import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Loader2, DollarSign, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function ItineraryBudgetSuggestions({ budgetRemaining, trip, preferences, destination, flightBudget, accomBudget, itineraryDays }) {
  const [open, setOpen] = useState(true);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const isOverBudget = budgetRemaining < 0;
  const amountOver = Math.abs(Math.round(budgetRemaining));
  const amountRemaining = Math.round(budgetRemaining);
  const destName = trip?.destination_name || destination?.name || "this destination";

  const fetchSuggestions = async () => {
    setLoading(true);
    setSuggestions(null);
    try {
      // Build a brief summary of current itinerary activities for context
      const activitySummary = (itineraryDays || []).slice(0, 5).map((day, i) => {
        const dayNum = day.day_number || day.day || (i + 1);
        const parts = [];
        if (day.morning?.activity) parts.push(`Morning: ${day.morning.activity} ($${day.morning.estimated_cost || day.morning.cost || 0})`);
        if (day.afternoon?.activity) parts.push(`Afternoon: ${day.afternoon.activity} ($${day.afternoon.estimated_cost || day.afternoon.cost || 0})`);
        if (day.evening?.dinner_spot) parts.push(`Evening: ${day.evening.dinner_spot} ($${day.evening.estimated_cost || 0})`);
        return `Day ${dayNum}: ${parts.join(", ")} — Daily total: $${day.daily_spend_estimate || 0}`;
      }).join("\n");

      if (isOverBudget) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a budget travel expert. The traveler is $${amountOver} OVER their total trip budget for ${destName}.

Current itinerary activities:
${activitySummary || "Not available"}

Flights: ${flightBudget > 0 ? `$${flightBudget}` : "included"}
Accommodation: ${accomBudget > 0 ? `$${accomBudget}` : "included"}
Traveler type: ${preferences?.traveler_type || "solo"}, ${preferences?.num_travelers || 1} person(s)
Interests: ${preferences?.interests?.join(", ") || "general sightseeing"}

Suggest 4 specific ways to cut costs from the current itinerary to get back under budget. For each, suggest a cheaper alternative to swap in. Be specific with real cheaper options.`,
          response_json_schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    swap_out: { type: "string" },
                    swap_in: { type: "string" },
                    estimated_savings: { type: "number" },
                    description: { type: "string" },
                    why: { type: "string" }
                  }
                }
              }
            }
          }
        });
        setSuggestions({ mode: "over", items: result?.suggestions || [] });
      } else {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a travel expert. The traveler has $${amountRemaining} remaining in their TOTAL trip budget for ${destName} (after flights${flightBudget > 0 ? ` $${flightBudget}` : ''} and accommodation${accomBudget > 0 ? ` $${accomBudget}` : ''}).

Trip context:
- Destination: ${destName}, ${trip?.country || ""}
- Traveler type: ${preferences?.traveler_type || "solo"}, ${preferences?.num_travelers || 1} person(s)
- Interests: ${preferences?.interests?.join(", ") || "general sightseeing"}
- Dietary: ${preferences?.dietary?.join(", ") || "no restrictions"}

Suggest 4 specific activities or upgrades they could add with this remaining budget. Mix free/cheap options and one splurge. Be specific with real place names.`,
          response_json_schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    type: { type: "string", enum: ["add", "replace", "upgrade"] },
                    estimated_cost: { type: "number" },
                    description: { type: "string" },
                    why: { type: "string" }
                  }
                }
              }
            }
          }
        });
        setSuggestions({ mode: "under", items: result?.suggestions || [] });
      }
    } catch (e) {
      setSuggestions({ mode: isOverBudget ? "over" : "under", items: [] });
    } finally {
      setLoading(false);
    }
  };

  const typeColors = {
    add:     { bg: "bg-emerald-50", text: "text-emerald-700", label: "Add to itinerary" },
    replace: { bg: "bg-amber-50",   text: "text-amber-700",   label: "Replace activity"  },
    upgrade: { bg: "bg-primary/8",  text: "text-primary",     label: "Upgrade"           },
  };

  // Style based on over/under budget
  const isOver = isOverBudget;
  const containerClass = isOver
    ? "bg-red-50 border border-red-200 rounded-2xl overflow-hidden"
    : "bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden";
  const headerHover = isOver ? "hover:bg-red-100/50" : "hover:bg-emerald-100/50";
  const iconBg = isOver ? "bg-red-500/20" : "bg-emerald-500/20";
  const iconColor = isOver ? "text-red-600" : "text-emerald-600";
  const titleColor = isOver ? "text-red-800" : "text-emerald-800";
  const subtitleColor = isOver ? "text-red-600" : "text-emerald-600";
  const chevronColor = isOver ? "text-red-500" : "text-emerald-600";
  const borderColor = isOver ? "border-red-200" : "border-emerald-200";
  const btnClass = isOver
    ? "w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-inter"
    : "w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-inter";
  const regenClass = isOver
    ? "w-full rounded-xl border-red-300 text-red-700 hover:bg-red-50 font-inter"
    : "w-full rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-inter";
  const cardBorder = isOver ? "border-red-100" : "border-emerald-100";
  const loaderColor = isOver ? "text-red-600" : "text-emerald-600";
  const loaderText = isOver ? "text-red-700" : "text-emerald-700";

  return (
    <div className={containerClass}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 ${headerHover} transition-colors`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
            {isOver
              ? <TrendingDown className={`w-4 h-4 ${iconColor}`} />
              : <DollarSign className={`w-4 h-4 ${iconColor}`} />
            }
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold ${titleColor} font-inter`}>
              {isOver
                ? <>You're <span className="font-bold">${amountOver.toLocaleString()}</span> over budget</>
                : <>You have <span className="font-bold">${amountRemaining.toLocaleString()}</span> remaining in your budget</>
              }
            </p>
            <p className={`text-xs ${subtitleColor} font-inter`}>
              {isOver
                ? "Get AI suggestions to swap out activities and save money"
                : "Get AI suggestions for activities or upgrades to fill your budget"
              }
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp className={`w-4 h-4 ${chevronColor} flex-shrink-0`} />
          : <ChevronDown className={`w-4 h-4 ${chevronColor} flex-shrink-0`} />
        }
      </button>

      {open && (
        <div className={`border-t ${borderColor} px-5 pb-5 pt-4`}>
          {!suggestions && !loading && (
            <Button onClick={fetchSuggestions} className={btnClass} size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              {isOver
                ? `Suggest swaps to save $${amountOver.toLocaleString()}`
                : `Suggest activities to add with $${amountRemaining.toLocaleString()} remaining`
              }
            </Button>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className={`w-4 h-4 ${loaderColor} animate-spin`} />
              <span className={`text-sm ${loaderText} font-inter`}>
                {isOver ? "Finding ways to cut costs…" : "Finding the best options for your remaining budget…"}
              </span>
            </div>
          )}

          {suggestions && suggestions.items?.length > 0 && (
            <div className="space-y-3">
              {suggestions.mode === "over"
                ? suggestions.items.map((s, i) => (
                    <div key={i} className={`bg-white rounded-xl p-4 border ${cardBorder} shadow-sm`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-inter">
                              Swap out
                            </span>
                            {s.estimated_savings > 0 && (
                              <span className="text-xs font-semibold text-emerald-600 font-inter">
                                Save ~${s.estimated_savings.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold font-inter text-foreground">{s.title}</p>
                          {s.swap_out && (
                            <p className="text-xs font-inter mt-1">
                              <span className="text-red-500 font-semibold">Remove:</span> <span className="text-muted-foreground">{s.swap_out}</span>
                            </p>
                          )}
                          {s.swap_in && (
                            <p className="text-xs font-inter mt-0.5">
                              <span className="text-emerald-600 font-semibold">Replace with:</span> <span className="text-muted-foreground">{s.swap_in}</span>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-inter mt-1 leading-relaxed">{s.description}</p>
                          {s.why && (
                            <p className="text-xs text-red-700 font-inter mt-1 italic">💡 {s.why}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                : suggestions.items.map((s, i) => {
                    const style = typeColors[s.type] || typeColors.add;
                    return (
                      <div key={i} className={`bg-white rounded-xl p-4 border ${cardBorder} shadow-sm`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} font-inter`}>
                                {style.label}
                              </span>
                              <span className="text-xs text-muted-foreground font-inter">
                                ~${s.estimated_cost?.toLocaleString() ?? "free"}
                              </span>
                            </div>
                            <p className="text-sm font-semibold font-inter text-foreground">{s.title}</p>
                            <p className="text-xs text-muted-foreground font-inter mt-1 leading-relaxed">{s.description}</p>
                            {s.why && (
                              <p className="text-xs text-emerald-700 font-inter mt-1 italic">💡 {s.why}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
              <Button
                variant="outline"
                size="sm"
                className={regenClass}
                onClick={fetchSuggestions}
              >
                <Sparkles className="w-3.5 h-3.5 mr-2" /> Regenerate suggestions
              </Button>
            </div>
          )}

          {suggestions && suggestions.items?.length === 0 && (
            <p className="text-sm text-muted-foreground font-inter text-center py-3">No suggestions found. Try regenerating.</p>
          )}
        </div>
      )}
    </div>
  );
}