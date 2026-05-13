import React, { useState } from "react";
import { Plane, Bed, UtensilsCrossed, Compass, Bus, Shield, DollarSign, ChevronDown, Brain } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function BudgetRow({ icon: Icon, label, budget, comfortable, splurge }) {
  return (
    <div className="grid grid-cols-4 gap-4 py-3 border-b border-border/50 items-center">
      <div className="flex items-center gap-2 text-sm font-inter">
        <Icon className="w-4 h-4 text-muted-foreground" /> {label}
      </div>
      <div className="text-sm font-inter font-medium text-center">${budget?.toLocaleString()}</div>
      <div className="text-sm font-inter font-medium text-center">${comfortable?.toLocaleString()}</div>
      <div className="text-sm font-inter font-medium text-center">${splurge?.toLocaleString()}</div>
    </div>
  );
}

// ── ML Budget Analysis Section ──────────────────────────────────────────────
function MLBudgetAnalysis({ trip, budget, grandBudget, grandComf, grandSplurge, computedGrandBudget, computedGrandComf, computedGrandSplurge, itineraryActualCost, onSwitchToItinerary, flightBudget, accomBudget, numTravelers = 1, selectedFlight, selectedAccom }) {
  const mlScore  = trip?.ml_score ?? trip?.scores?.budget_fit ?? 0;
  // flightBudget and accomBudget are already resolved to selected options upstream
  const effectiveFlightCost = flightBudget || 0;
  const effectiveAccomCost = accomBudget || 0;
  // itineraryActualCost is already the party total (multiplied upstream)
  const actualCost = itineraryActualCost != null
    ? itineraryActualCost + effectiveFlightCost + effectiveAccomCost
    : (grandBudget ?? trip?.total_cost_budget ?? 0);
  const remaining  = budget - actualCost;
  const pctUsed    = actualCost > 0 && budget > 0 ? (actualCost / budget) * 100 : 0;

  const getLabel = (score) => {
    if (score >= 90) return { text: 'Fits your budget',          color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
    if (score >= 70) return { text: 'Slightly over budget',      color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200'   };
    if (score >= 50) return { text: 'Stretches your budget',     color: 'text-orange-600',  bg: 'bg-orange-50',  ring: 'ring-orange-200'  };
    if (score >= 20) return { text: 'Significantly over budget', color: 'text-red-500',     bg: 'bg-red-50',     ring: 'ring-red-200'     };
    return              { text: 'Over budget',                   color: 'text-red-600',     bg: 'bg-red-50',     ring: 'ring-red-200'     };
  };

  const mlLabel = getLabel(mlScore);

  // Gauge circle with stroke-dasharray
  const r = 56, cx = 80, cy = 80;
  const circumference = 2 * Math.PI * r;
  const gaugeColor = mlScore >= 85 ? '#10b981' : mlScore >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-card rounded-2xl p-8 shadow-sm">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-playfair text-xl font-semibold">Budget Analysis</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-8">

        {/* Left: Gauge + score */}
        <div className="flex flex-col items-center">
          <svg width="160" height="160" viewBox="0 0 160 160" className="mb-2">
            {/* Background ring */}
            <circle cx={cx} cy={cy} r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
            
            {/* Progress ring */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={gaugeColor}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - mlScore / 100)}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="24" fontWeight="bold" fill={gaugeColor}>{mlScore}</text>
            <text x={cx} y={cy + 24} textAnchor="middle" fontSize="10" fill="#6b7280">/ 100</text>
          </svg>
          <div className={`mt-2 px-4 py-2 rounded-xl ring-1 ${mlLabel.bg} ${mlLabel.ring} text-center`}>
            <p className={`text-sm font-semibold font-inter ${mlLabel.color}`}>{mlLabel.text}</p>
            <p className="text-xs text-muted-foreground font-inter mt-0.5">Budget fit score</p>
          </div>
        </div>

        {/* Right: Budget closeness breakdown */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-inter">
            How Close Are You to Your Budget?
          </p>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm font-inter">
              <span className="text-muted-foreground">
                Estimated trip cost{numTravelers > 1 ? ` (${numTravelers} travelers)` : ''}
                {itineraryActualCost != null && (
                  <button
                    onClick={onSwitchToItinerary}
                    className="ml-1 text-xs text-primary font-semibold underline underline-offset-2 hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    (incl. flights & stay)
                  </button>
                )}
              </span>
              <span className="font-bold">${actualCost.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground font-inter space-y-0.5 pl-1">
              {effectiveFlightCost > 0 && (
                <div>✈️ Flights{selectedFlight && numTravelers > 1 ? ` (${numTravelers}×$${(selectedFlight.estimated_price_per_person || selectedFlight.price_per_person || 0).toLocaleString()}/person)` : ''}: <span className="font-semibold">${effectiveFlightCost.toLocaleString()}</span> total</div>
              )}
              {effectiveAccomCost > 0 && (
                <div>🏨 Accommodation{selectedAccom ? ` (${selectedAccom.name})` : ''}: <span className="font-semibold">${effectiveAccomCost.toLocaleString()}</span> total</div>
              )}
              {itineraryActualCost != null && (
                <div>🗓️ Activities & food{numTravelers > 1 ? ` (${numTravelers} travelers)` : ''}: <span className="font-semibold">${itineraryActualCost.toLocaleString()}</span> total</div>
              )}
              {numTravelers > 1 && (
                <div className="text-primary font-semibold mt-0.5">= ${actualCost.toLocaleString()} total · ${Math.round(actualCost / numTravelers).toLocaleString()}/person</div>
              )}
            </div>
            <div className="flex justify-between text-sm font-inter mt-1">
              <span className="text-muted-foreground">Your budget</span>
              <span className="font-bold">${budget.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-muted rounded-sm overflow-hidden w-full">
              <div
                className={`h-full transition-all duration-700 ${pctUsed <= 85 ? 'bg-emerald-500' : pctUsed <= 100 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, pctUsed)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-inter">
              <span>{pctUsed.toFixed(0)}% of budget used</span>
              <span className={remaining >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                {remaining >= 0 ? `$${remaining.toLocaleString()} remaining` : `$${Math.abs(remaining).toLocaleString()} over budget`}
              </span>
            </div>
          </div>

          {/* Tiers vs budget */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-inter">All Tiers vs Your Budget</p>
            {[
              { label: 'Budget tier',      cost: computedGrandBudget,      color: 'bg-emerald-500' },
              { label: 'Comfortable tier', cost: computedGrandComf,        color: 'bg-primary'     },
              { label: 'Splurge tier',     cost: computedGrandSplurge,     color: 'bg-amber-500'   },
            ].map(({ label, cost, color }) => {
              if (!cost) return null;
              const over = cost > budget;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs font-inter mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${over ? 'text-red-500' : 'text-emerald-600'}`}>
                      ${cost.toLocaleString()} {over ? '↑ over' : '✓'}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, (cost / budget) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground font-inter text-right">← bars end at your ${budget.toLocaleString()} budget</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main BudgetTab ────────────────────────────────────────────────────────────
export default function BudgetTab({ trip, content, preferences, destination, itineraryContent, onSwitchToItinerary, selectedFlight, selectedAccom, allFlights = [], allAccommodations = [] }) {
  const [selectedSeason, setSelectedSeason] = useState(null);

  const days         = trip?.trip_length_days || 5;
  const numTravelers = preferences?.num_travelers || 1;
  const budget       = preferences?.budget || trip?.user_budget_cap || 1000;
  const ai           = content?.budget_breakdown || {};
  const selectedMonths  = preferences?.preferred_months || [];
  const monthPrices     = content?.month_price_comparison || {};
  const seasonWeather   = content?.season_weather || {};

  // Compute actual cost from itinerary running_total (last day) when available
  const itineraryDays = itineraryContent?.itinerary || [];
  // running_total and daily_spend_estimate are per-person; multiply by numTravelers for party total
  const itineraryActualCostPerPerson = itineraryDays.length > 0
    ? itineraryDays[itineraryDays.length - 1]?.running_total || itineraryDays.reduce((s, d) => s + (d.daily_spend_estimate || 0), 0)
    : null;
  const itineraryActualCost = itineraryActualCostPerPerson != null ? itineraryActualCostPerPerson * numTravelers : null;

  const baseGrandBudget  = ai.grand_total_budget_version || trip?.total_cost_budget || 0;
  const baseGrandComf    = ai.grand_total_comfortable_version || trip?.total_cost_comfortable || 0;
  const baseGrandSplurge = ai.grand_total_splurge_version || Math.round(baseGrandComf * 1.5);

  let grandBudget  = baseGrandBudget;
  let grandComf    = baseGrandComf;
  let grandSplurge = baseGrandSplurge;

  if (selectedSeason && monthPrices && Object.keys(monthPrices).length > 0) {
    const seasonPricing = Object.values(monthPrices).find(p => p.season === selectedSeason);
    if (seasonPricing) {
      grandBudget  = seasonPricing.budget;
      grandComf    = seasonPricing.comfortable;
      grandSplurge = seasonPricing.splurge;
    }
  }

  const nights = Math.max(1, (trip?.trip_length_days || 5) - 1);

  // Mirror ItineraryTripSummary: default to cheapest flight/accom when none selected
  const activeFlight = selectedFlight || (allFlights.length > 0
    ? allFlights.reduce((a, b) => (a.estimated_price_per_person || 0) < (b.estimated_price_per_person || 0) ? a : b)
    : null);
  const activeAccom = selectedAccom || (allAccommodations.length > 0
    ? allAccommodations.reduce((a, b) => (a.price_per_night || 0) < (b.price_per_night || 0) ? a : b)
    : null);

  let flightBudget  = activeFlight
    ? (activeFlight.estimated_price_per_person || activeFlight.price_per_person || 0) * numTravelers
    : (ai.flights_total || 0);
  // Sanitize accommodation_total — LLM sometimes returns:
  //   (a) per-night rate instead of full stay total
  //   (b) per-person per-night instead of group total
  // Fix: compare against expected minimum (accom_per_night * nights)
  // If too small, it's a per-night rate — multiply up to full stay total
  const rawAccomTotal    = ai.accommodation_total || 0;
  const numRoomsNeeded   = Math.ceil(numTravelers / 2);
  const accomPerNight    = trip?.budget_breakdown?.accom_per_night || trip?.accom_per_night || 0;
  const expectedMinTotal = accomPerNight > 0 ? accomPerNight * nights * numRoomsNeeded * 0.7 : 0;

  let llmAccomTotal = rawAccomTotal;
  if (rawAccomTotal > 0 && expectedMinTotal > 0) {
    if (rawAccomTotal < accomPerNight * 1.5) {
      // Looks like a single per-night rate — multiply by nights × rooms
      llmAccomTotal = rawAccomTotal * nights * numRoomsNeeded;
    } else if (rawAccomTotal < expectedMinTotal) {
      // Looks like per-person per-night — multiply by nights × travelers
      llmAccomTotal = rawAccomTotal * nights * numTravelers;
    }
  }

  let accomBudget   = activeAccom
    ? (activeAccom.price_for_full_trip || (activeAccom.price_per_night || 0) * nights * numRoomsNeeded)
    : llmAccomTotal;
  let foodBudget    = ai.food_total || 0;
  let activBudget   = ai.excursions_total || 0;
  let transBudget   = ai.transport_total || 0;
  let bufferBudget  = ai.buffer_amount || Math.round(baseGrandBudget * 0.1);

  if (selectedSeason && baseGrandBudget > 0 && grandBudget > 0) {
    const multiplier = grandBudget / baseGrandBudget;
    flightBudget  = Math.round(flightBudget  * multiplier);
    accomBudget   = Math.round(accomBudget   * multiplier);
    foodBudget    = Math.round(foodBudget    * multiplier);
    activBudget   = Math.round(activBudget   * multiplier);
    transBudget   = Math.round(transBudget   * multiplier);
    bufferBudget  = Math.round(bufferBudget  * multiplier);
  }

  const scale        = grandComf > 0 && grandBudget > 0 ? grandComf / grandBudget : 1.4;
  const scaleSplurge = grandSplurge > 0 && grandBudget > 0 ? grandSplurge / grandBudget : 2;
  const flightComf   = Math.round(flightBudget * scale);   const flightSplurge   = Math.round(flightBudget * scaleSplurge);
  const accomComf    = Math.round(accomBudget * scale);    const accomSplurge    = Math.round(accomBudget * scaleSplurge);
  const foodComf     = Math.round(foodBudget * scale);     const foodSplurge     = Math.round(foodBudget * scaleSplurge);
  const activComf    = Math.round(activBudget * scale);    const activSplurge    = Math.round(activBudget * scaleSplurge);
  const transComf    = Math.round(transBudget * scale);    const transSplurge    = Math.round(transBudget * scaleSplurge);
  const bufferComf   = Math.round(grandComf * 0.1);        const bufferSplurge   = Math.round(grandSplurge * 0.1);

  // Grand totals = sum of category rows (so they always match what's displayed)
  const computedGrandBudget  = flightBudget + accomBudget + foodBudget + activBudget + transBudget + bufferBudget;
  const computedGrandComf    = flightComf   + accomComf   + foodComf   + activComf   + transComf   + bufferComf;
  const computedGrandSplurge = flightSplurge + accomSplurge + foodSplurge + activSplurge + transSplurge + bufferSplurge;

  const getIndicator = (total) => {
    if (total <= budget)         return { color: 'text-emerald-600 bg-emerald-50', text: '✓ Under budget' };
    if (total <= budget * 1.15)  return { color: 'text-amber-600 bg-amber-50',    text: '⚠ Close to budget' };
    return                              { color: 'text-red-600 bg-red-50',         text: '✗ Over budget' };
  };

  if (!ai.grand_total_budget_version && grandBudget === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
        <DollarSign className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-xl font-semibold mb-2">Budget Breakdown</h3>
        <p className="text-sm text-muted-foreground font-inter">Your budget analysis is being calculated. It will appear here once ready!</p>
      </div>
    );
  }

  const isMLMode = !!(trip?.ml_score ?? null);

  return (
    <div className="space-y-8">

      {/* ML Mode Indicator Banner */}
      <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-2xl px-5 py-3">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary font-inter">ML Model Active</p>
          <p className="text-xs text-muted-foreground font-inter">
            Budget fit scores on this page are predicted by the GradientBoostingRegressor — not the rule-based formula.
            Sections marked <span className="text-primary font-semibold">🧠 ML</span> use model output.
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
            Budget Fit: {trip?.ml_score ?? trip?.scores?.budget_fit}/100
          </span>
        </div>
      </div>

      {/* Cost Breakdown Table — unchanged */}
      <div className="bg-card rounded-2xl p-8 shadow-sm overflow-x-auto">
        <h3 className="font-playfair text-xl font-semibold mb-6 flex items-center gap-2">
          Cost Breakdown
          <span className="flex items-center gap-1 text-xs font-sans font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
            <Brain className="w-3 h-3" /> Grand Total uses ML score
          </span>
        </h3>
        <div className="grid grid-cols-4 gap-4 pb-3 border-b-2 border-border">
          <div className="text-sm font-inter font-semibold text-muted-foreground">Category</div>
          <div className="text-sm font-inter font-semibold text-center text-emerald-700">Budget</div>
          <div className="text-sm font-inter font-semibold text-center text-primary">Comfortable</div>
          <div className="text-sm font-inter font-semibold text-center text-amber-700">Splurge</div>
        </div>
        <BudgetRow icon={Plane}           label="Flights"                      budget={flightBudget} comfortable={flightComf} splurge={flightSplurge} />
        <BudgetRow icon={Bed}             label={`Accommodation (${days-1} nights)`} budget={accomBudget}  comfortable={accomComf}  splurge={accomSplurge}  />
        <BudgetRow icon={UtensilsCrossed} label={`Food (${days} days)`}        budget={foodBudget}   comfortable={foodComf}   splurge={foodSplurge}   />
        <BudgetRow icon={Compass}         label="Activities"                   budget={activBudget}  comfortable={activComf}  splurge={activSplurge}  />
        <BudgetRow icon={Bus}             label="Transport"                    budget={transBudget}  comfortable={transComf}  splurge={transSplurge}  />
        <BudgetRow icon={Shield}          label="Buffer (10%)"                 budget={bufferBudget} comfortable={bufferComf} splurge={bufferSplurge} />

        <div className="grid grid-cols-4 gap-4 pt-4 mt-2 border-t-2 border-border">
          <div className="text-sm font-inter font-bold flex items-center gap-1.5">
            Grand Total
            <span className="flex items-center gap-0.5 text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
              <Brain className="w-2.5 h-2.5" /> ML
            </span>
          </div>
          {[computedGrandBudget, computedGrandComf, computedGrandSplurge].map((total, i) => {
            const ind = getIndicator(total);
            return (
              <div key={i} className="text-center">
                <div className="text-lg font-inter font-bold">${total.toLocaleString()}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-inter font-medium ${ind.color}`}>{ind.text}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <div className="flex justify-between text-xs text-muted-foreground font-inter mb-2">
            <span className="flex items-center gap-1">
              <span className="flex items-center gap-0.5 text-primary font-semibold"><Brain className="w-2.5 h-2.5" /> ML-predicted fit</span>
            </span>
            <span>Your budget: ${budget.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden relative">
            <div className="absolute h-full bg-emerald-400/60 rounded-full" style={{ width: `${Math.min(100, (computedGrandBudget / budget) * 100)}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs font-inter text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Budget: ${computedGrandBudget.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── ML Budget Analysis ── */}
      <MLBudgetAnalysis trip={trip} budget={budget} grandBudget={grandBudget} grandComf={grandComf} grandSplurge={grandSplurge} computedGrandBudget={computedGrandBudget} computedGrandComf={computedGrandComf} computedGrandSplurge={computedGrandSplurge} itineraryActualCost={itineraryActualCost} onSwitchToItinerary={onSwitchToItinerary} flightBudget={flightBudget} accomBudget={accomBudget} numTravelers={numTravelers} selectedFlight={activeFlight} selectedAccom={activeAccom} />

      {/* Month Comparison — unchanged */}
      {selectedMonths.length > 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-6">Compare Prices by Month</h3>
          {Object.keys(monthPrices).length > 0 ? (
            <div className="overflow-x-auto">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${selectedMonths.length + 1}, minmax(120px, 1fr))` }}>
                <div className="text-xs font-inter font-semibold text-muted-foreground">Pricing Tier</div>
                {selectedMonths.map(month => (
                  <div key={month} className="text-xs font-inter font-semibold text-center">{month.slice(0, 3)}</div>
                ))}
                <div className="text-sm font-inter font-semibold text-emerald-700">Budget</div>
                {selectedMonths.map(month => (
                  <div key={`budget-${month}`} className="text-sm font-inter font-bold text-center">${monthPrices[month]?.budget?.toLocaleString() || '—'}</div>
                ))}
                <div className="text-sm font-inter font-semibold text-primary">Comfortable</div>
                {selectedMonths.map(month => (
                  <div key={`comfortable-${month}`} className="text-sm font-inter font-bold text-center">${monthPrices[month]?.comfortable?.toLocaleString() || '—'}</div>
                ))}
                <div className="text-sm font-inter font-semibold text-amber-700">Splurge</div>
                {selectedMonths.map(month => (
                  <div key={`splurge-${month}`} className="text-sm font-inter font-bold text-center">${monthPrices[month]?.splurge?.toLocaleString() || '—'}</div>
                ))}
                <div className="text-xs font-inter text-muted-foreground">Season</div>
                {selectedMonths.map(month => (
                  <div key={`season-${month}`} className="text-xs font-inter text-center text-muted-foreground">{monthPrices[month]?.season || '—'}</div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-inter text-center">Month pricing data will appear once generated.</p>
          )}
        </div>
      )}

      {/* Price Trends — unchanged */}
      {Object.keys(monthPrices).length > 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-6">Price Trends Across Months</h3>
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={Object.entries(monthPrices).map(([month, prices]) => ({
                month: month.slice(0, 3), Budget: prices?.budget || 0, Comfortable: prices?.comfortable || 0, Splurge: prices?.splurge || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={(value) => `$${value?.toLocaleString()}`} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }} cursor={{ stroke: '#00d084' }} />
                <Legend />
                <Line type="monotone" dataKey="Budget"      stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" dataKey="Comfortable" stroke="#00d084" strokeWidth={2} dot={{ fill: '#00d084', r: 4 }} />
                <Line type="monotone" dataKey="Splurge"     stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            {(() => {
              const allMonths   = Object.entries(monthPrices);
              const budgetVals  = allMonths.map(([_, p]) => p?.budget || 0);
              const comfortVals = allMonths.map(([_, p]) => p?.comfortable || 0);
              const splurgeVals = allMonths.map(([_, p]) => p?.splurge || 0);
              return (
                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  {[['Budget Tier', budgetVals, 'bg-emerald-50'], ['Comfortable', comfortVals, 'bg-primary/10'], ['Splurge', splurgeVals, 'bg-amber-50']].map(([label, vals, bg]) => (
                    <div key={label} className={`${bg} rounded-lg p-4 text-center`}>
                      <div className="text-xs text-muted-foreground font-inter font-semibold uppercase">{label}</div>
                      <div className="space-y-1 mt-2 text-sm font-inter">
                        <div><span className="text-muted-foreground">Min:</span> <span className="font-bold">${Math.min(...vals).toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Avg:</span> <span className="font-bold">${Math.round(vals.reduce((a,b)=>a+b,0)/vals.length).toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Max:</span> <span className="font-bold">${Math.max(...vals).toLocaleString()}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Seasonal Weather — unchanged */}
      {Object.keys(seasonWeather).length > 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-6">Weather by Season</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Peak', 'Shoulder', 'Off-peak'].map(season => {
              const data = seasonWeather[season];
              if (!data) return null;
              return (
                <div key={season} className="bg-secondary/50 rounded-xl p-5">
                  <h4 className="font-inter font-semibold mb-1">{season} Season</h4>
                  {data.months?.length > 0 && <p className="text-xs text-muted-foreground mb-3">{data.months.join(", ")}</p>}
                  <div className="space-y-2 text-sm font-inter">
                    {data.high_f && <div className="flex justify-between"><span className="text-muted-foreground">High</span><span className="font-semibold">{data.high_f}°F</span></div>}
                    {data.low_f  && <div className="flex justify-between"><span className="text-muted-foreground">Low</span><span className="font-semibold">{data.low_f}°F</span></div>}
                    {data.humidity && <div className="flex justify-between"><span className="text-muted-foreground">Humidity</span><span className="font-semibold">{data.humidity}</span></div>}
                  </div>
                  {data.description && <p className="text-xs text-muted-foreground mt-3 italic">{data.description}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lower Cost Tips — unchanged */}
      <Collapsible>
        <CollapsibleTrigger className="w-full bg-card rounded-2xl p-6 shadow-sm flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-playfair text-lg font-semibold">How to Lower This Trip's Cost</span>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-card rounded-b-2xl px-8 pb-8 -mt-4 pt-4 shadow-sm">
            <ul className="space-y-3">
              {(content?.lower_cost_tips || [
                "Fly on Tuesday or Wednesday for 15-20% cheaper fares",
                "Book a hostel dorm instead of a private room to save 40-60%",
                "Eat street food for at least 2 meals per day",
                "Focus on free walking tours and park activities",
                "Travel during shoulder season for lower prices across the board"
              ]).map((tip, i) => (
                <li key={i} className="text-sm font-inter text-muted-foreground flex items-start gap-2">
                  <span className="text-primary font-bold">💡</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}