import React, { useState, useEffect } from "react";
import { CalendarDays, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

function formatDate(d) {
  if (!d) return "";
  if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = d.split('-');
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function getTodayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toInputDate(d) {
  if (!d) return "";
  if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
  return "";
}

export default function TripDatePicker({ trip, preferences, tripDates, onDatesChange }) {
  const [departure, setDeparture] = useState(tripDates?.departure || "");
  const [returnDate, setReturnDate] = useState(tripDates?.return || "");
  const [suggesting, setSuggesting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync if parent changes
  useEffect(() => {
    if (tripDates?.departure) setDeparture(tripDates.departure);
    if (tripDates?.return) setReturnDate(tripDates.return);
  }, [tripDates?.departure, tripDates?.return]);

  // Timezone-safe night calculation: parse YYYY-MM-DD as local date parts
  // NOT new Date(string) which converts to UTC and causes off-by-one in US timezones
  const parseLocal = (s) => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const nights = departure && returnDate
    ? Math.round((parseLocal(returnDate) - parseLocal(departure)) / 86400000)
    : null;

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const today = getTodayYMD();
      const days = trip?.trip_length_days || preferences?.min_days || 5;
      const dest = trip?.destination_name || 'the destination';
      const budget = preferences?.budget || trip?.user_budget_cap || 1000;

      // Determine allowed date window from user's available_dates or preferred_months
      const availableDates = preferences?.available_dates?.filter(d => d.start && d.end) || [];
      const months = preferences?.preferred_months?.length > 0
        ? preferences.preferred_months.join(', ')
        : 'any good travel month';

      // Build a strict constraint string so AI stays within the user's window
      let dateConstraint = `The departure date MUST be today (${today}) or later. Never suggest dates in the past.`;
      if (availableDates.length > 0) {
        // Use the first available date window
        const window = availableDates[0];
        dateConstraint = `CRITICAL: You MUST pick dates that fall WITHIN the user's available window: ${window.start} to ${window.end}. The departure must be on or after ${window.start} and the return must be on or before ${window.end}. Never go outside this window. Never suggest dates in the past (today is ${today}).`;
      } else if (preferences?.preferred_months?.length > 0) {
        dateConstraint = `CRITICAL: You MUST pick a departure date that falls in one of these months: ${months}. Today is ${today} — never suggest past dates.`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a travel expert. Suggest the best departure and return dates for a ${days}-day trip to ${dest}.
Budget: $${budget}. Departure from: ${preferences?.home_airport || 'US'}.
Consider: avoid peak prices, best weather, value for money.
${dateConstraint}
The trip must be exactly ${days} days long (return = departure + ${days} days).
Return ONLY a JSON object: { "departure": "YYYY-MM-DD", "return": "YYYY-MM-DD", "reason": "short reason" }`,
        response_json_schema: {
          type: "object",
          properties: {
            departure: { type: "string" },
            return: { type: "string" },
            reason: { type: "string" }
          }
        }
      });

      if (result?.departure && result.departure >= today) {
        // Enforce available_dates window if set
        let dep = result.departure;
        let ret = result.return || "";
        if (availableDates.length > 0) {
          const window = availableDates[0];
          if (dep < window.start) dep = window.start;
          if (dep > window.end) dep = window.start; // fallback to window start
          // Recalculate return based on enforced departure
          const depDate = new Date(dep);
          depDate.setDate(depDate.getDate() + days);
          const retYMD = depDate.toISOString().split('T')[0];
          ret = retYMD <= window.end ? retYMD : window.end;
        }
        setDeparture(dep);
        setReturnDate(ret);
        onDatesChange({ departure: dep, return: ret });
      }
    } catch (e) {
      // silently fail
    } finally {
      setSuggesting(false);
    }
  };

  const handleApply = () => {
    onDatesChange({ departure, return: returnDate });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setDeparture("");
    setReturnDate("");
    onDatesChange({ departure: "", return: "" });
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="font-inter font-semibold text-sm">Your Travel Dates</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs gap-1.5"
          onClick={handleSuggest}
          disabled={suggesting}
        >
          {suggesting
            ? <><Sparkles className="w-3 h-3 animate-spin" /> Suggesting...</>
            : <><Sparkles className="w-3 h-3" /> AI Suggest Dates</>}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end">
         <div className="flex-1">
           <label className="text-xs text-muted-foreground font-inter mb-1 block">Departure</label>
           <input
             type="date"
             value={toInputDate(departure)}
             min={getTodayYMD()}
             onChange={e => setDeparture(e.target.value)}
             className="w-full border border-input rounded-xl px-3 py-2 text-sm font-inter bg-background focus:outline-none focus:ring-2 focus:ring-ring"
           />
         </div>
         <div className="flex-1">
           <label className="text-xs text-muted-foreground font-inter mb-1 block">Return</label>
           <input
             type="date"
             value={toInputDate(returnDate)}
             min={departure || getTodayYMD()}
             onChange={e => setReturnDate(e.target.value)}
             className="w-full border border-input rounded-xl px-3 py-2 text-sm font-inter bg-background focus:outline-none focus:ring-2 focus:ring-ring"
           />
         </div>
        <div className="flex gap-2">
          <Button size="sm" className="rounded-xl text-xs" onClick={handleApply} disabled={!departure}>
            {saved ? <><Check className="w-3 h-3" /> Saved</> : "Apply"}
          </Button>
          {(departure || returnDate) && (
            <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={handleClear}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {departure && returnDate && nights !== null && nights > 0 && (
        <p className="text-xs text-primary font-inter font-semibold mt-3">
          ✈️ {formatDate(departure)} → {formatDate(returnDate)} · {nights} night{nights !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}