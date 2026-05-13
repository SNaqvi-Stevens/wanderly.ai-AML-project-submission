import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight, Star, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScoreBadge from "./ScoreBadge";
import { base44 } from "@/api/base44Client";

export default function TripCard({ trip, preferences, rank }) {
  const [favorited, setFavorited] = useState(trip.is_favorited || false);
  const [numTravelers, setNumTravelers] = useState(preferences?.num_travelers || 1);

  const budgetRatio = trip.total_cost_budget / trip.user_budget_cap;  // total_cost_budget is already the group total
  const barColor    = budgetRatio <= 0.85 ? 'bg-emerald-500'
                    : budgetRatio <= 1.0  ? 'bg-amber-500'
                    : 'bg-red-500';

  // ML budget confidence — only shown when ml_score is present (ML mode active)
  const mlBudgetFit     = trip.ml_score ?? null;
  const ruleBudgetFit   = trip.rule_based_budget ?? trip.scores?.budget_fit ?? null;
  const isMLMode        = mlBudgetFit !== null && mlBudgetFit !== undefined;

  // How close is the trip to the user's budget?
  // budget_fit of 90+ = comfortably within budget
  // budget_fit of 60-89 = slightly over but doable
  // budget_fit below 60 = stretching the budget
  const budgetScore   = trip.scores?.budget_fit ?? 0;
  // Budget score → what it actually means based on scoring.js formula bands:
  // 90-100 = cost is at or below budget (formula returns 90+ here)
  // 70-89  = cost is up to ~8% over budget
  // 50-69  = cost is 8-30% over budget
  // 20-49  = cost is 30-50% over budget
  // 0-19   = cost is 50%+ over budget
  const budgetLabel   = budgetScore >= 90 ? 'Fits your budget'
                      : budgetScore >= 70 ? 'Slightly over budget'
                      : budgetScore >= 50 ? 'Stretches your budget'
                      : budgetScore >= 20 ? 'Significantly over budget'
                      : 'Over budget';
  const budgetLabelColor = budgetScore >= 90 ? 'text-emerald-600'
                         : budgetScore >= 70 ? 'text-amber-500'
                         : budgetScore >= 50 ? 'text-orange-500'
                         : 'text-red-500';

  // ML vs rule-based difference
  const mlDiff = isMLMode && ruleBudgetFit !== null
    ? mlBudgetFit - ruleBudgetFit
    : null;

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newVal = !favorited;
    setFavorited(newVal);
    if (trip.id) {
      await base44.entities.Trip.update(trip.id, { is_favorited: newVal });
    }
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">

      {/* Photo */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={trip.hero_image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200"}
          alt={trip.destination_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {trip.is_bucket_list && (
            <Badge className="bg-amber-500/90 text-white border-0 rounded-lg text-xs font-inter">
              <Star className="w-3 h-3 mr-1" /> Your Dream Trip
            </Badge>
          )}
          <Badge className={`border-0 rounded-lg text-xs font-inter text-white ${
            trip.season_label === 'Peak'     ? 'bg-red-500/80'
          : trip.season_label === 'Off-Peak' ? 'bg-emerald-500/80'
          : 'bg-amber-500/80'}`}>
            {trip.season_label === 'Peak'     ? '🔥 Peak Season'
           : trip.season_label === 'Off-Peak' ? '✓ Off-Peak'
           : '◐ Shoulder Season'}
          </Badge>
          {/* ML mode badge */}
          {isMLMode && (
            <Badge className="bg-primary/80 text-white border-0 rounded-lg text-xs font-inter flex items-center gap-1">
              <Brain className="w-3 h-3" /> ML
            </Badge>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
        >
          <Heart className={`w-4 h-4 ${favorited ? 'fill-red-400 text-red-400' : 'text-white'}`} />
        </button>

        {/* Destination name */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-playfair text-2xl font-bold text-white">{trip.destination_name}</h3>
          <p className="text-white/80 text-sm font-inter mt-0.5">{trip.country} • {trip.region}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">

        {/* Cost + Budget Bar */}
        <div className="mb-4">
          {/* Traveler adjuster */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-inter">Travelers:</span>
            <button onClick={(e) => { e.preventDefault(); setNumTravelers(n => Math.max(1, n - 1)); }} className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-xs font-bold hover:bg-secondary transition-colors">−</button>
            <span className="text-sm font-inter font-bold">{numTravelers}</span>
            <button onClick={(e) => { e.preventDefault(); setNumTravelers(n => Math.min(20, n + 1)); }} className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-xs font-bold hover:bg-secondary transition-colors">+</button>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-inter font-bold">${trip.total_cost_budget?.toLocaleString()}</span>
              <span className="text-muted-foreground text-sm ml-1">– ${trip.total_cost_comfortable?.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-inter">of ${trip.user_budget_cap?.toLocaleString()}</div>
              {numTravelers > 1 && <div className="text-xs text-muted-foreground font-inter">total for {numTravelers} traveler{numTravelers > 1 ? 's' : ''}</div>}
            </div>
          </div>

          {/* Budget progress bar */}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-500`}
              style={{ width: `${Math.min(100, budgetRatio * 100)}%` }}
            />
          </div>

          {/* Budget fit label row */}
          <div className="mt-1.5 flex items-center justify-between">
            <span className={`text-xs font-semibold font-inter ${budgetLabelColor}`}>
              {budgetLabel}
            </span>
            <span className="text-xs text-muted-foreground font-inter">
              Budget fit: <span className={`font-bold ${budgetLabelColor}`}>{budgetScore}</span>/100
            </span>
          </div>

          {/* ML indicator — shows when ML mode is active */}
          {isMLMode && mlDiff !== null && (
            <div className="mt-2 flex items-center gap-1.5 bg-primary/8 rounded-lg px-2.5 py-1.5">
              <Brain className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="text-xs text-primary font-inter">
                ML budget fit: <span className="font-bold">{mlBudgetFit}/100</span>
                <span className="text-muted-foreground ml-1">(formula: {ruleBudgetFit ?? '—'})</span>
              </span>
              <span className="text-xs text-muted-foreground font-inter ml-auto">
                {mlDiff > 0
                  ? <span className="text-emerald-600 font-semibold">ML +{mlDiff} pts above formula</span>
                  : mlDiff < 0
                  ? <span className="text-amber-500 font-semibold">ML {mlDiff} pts below formula</span>
                  : <span className="text-muted-foreground">ML matches formula exactly</span>
                }
              </span>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="flex gap-2 mb-4">
          <ScoreBadge label="Season"   value={trip.scores?.season}     color="primary" />
          <ScoreBadge label="Budget"   value={trip.scores?.budget_fit}  color="emerald" />
          <ScoreBadge label="Match"    value={trip.scores?.match}       color="coral" />
          <ScoreBadge label="Feasible" value={trip.scores?.feasibility} color="aqua" />
        </div>

        {/* Why we love this */}
        <p className="text-sm text-muted-foreground font-inter italic leading-relaxed line-clamp-2">
          "{trip.why_we_love_this}"
        </p>

        {/* CTA */}
        <Link to={`/trip/${encodeURIComponent(trip.destination_name)}`} state={{ trip, preferences: preferences ? { ...preferences, num_travelers: numTravelers } : { num_travelers: numTravelers } }}>
          <Button className="w-full mt-4 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
            View Full Plan <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}