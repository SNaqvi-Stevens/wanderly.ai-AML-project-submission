import React, { useState } from "react";
import { ExternalLink, Shirt, MessageSquare, Star, AlertTriangle, Lightbulb, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { key: "clothing", label: "👕 Clothing", icon: Shirt },
  { key: "essentials", label: "🎒 Essentials", icon: Lightbulb },
  { key: "tech", label: "🔌 Tech & Docs", icon: Lightbulb },
  { key: "health", label: "💊 Health & Safety", icon: AlertTriangle },
];

export default function PackingTipsTab({ trip, content }) {
  const tips = content?.packing_tips || {};
  const destName = trip?.destination_name || '';
  const country = trip?.country || '';

  const redditUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(`traveling to ${destName} tips advice`)}`;
  const tripadvisorUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(destName + ' travel tips')}`;
  const lonelyPlanetUrl = `https://www.lonelyplanet.com/search?q=${encodeURIComponent(destName)}`;

  if (!tips.clothing?.length && !tips.local_advice?.length) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
        <Shirt className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-xl font-semibold mb-2">Packing & Local Tips</h3>
        <p className="text-sm text-muted-foreground font-inter">Loading your personalized packing list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Packing List */}
      <div className="bg-card rounded-2xl p-8 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-6">🧳 What to Pack for {destName}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {CATEGORIES.map(({ key, label }) => {
            const items = tips[key] || [];
            if (!items.length) return null;
            return (
              <div key={key}>
                <h4 className="font-inter font-semibold text-sm mb-3">{label}</h4>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-inter text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{typeof item === 'string' ? item : item.item}
                        {item.note && <span className="text-xs italic ml-1 text-muted-foreground/70">— {item.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* What NOT to bring */}
      {tips.leave_at_home?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="font-inter font-semibold text-red-800">Leave at Home / Avoid Bringing</h4>
          </div>
          <ul className="space-y-2">
            {tips.leave_at_home.map((item, i) => (
              <li key={i} className="text-sm text-red-700 font-inter flex items-start gap-2">
                <span>✗</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dress Code / Cultural Notes */}
      {tips.dress_code_notes && (
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h4 className="font-inter font-semibold mb-2 flex items-center gap-2">
            <Shirt className="w-4 h-4 text-primary" /> Dress Code & Cultural Notes
          </h4>
          <p className="text-sm text-muted-foreground font-inter leading-relaxed">{tips.dress_code_notes}</p>
        </div>
      )}

      {/* Local Advice */}
      {tips.local_advice?.length > 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Advice from Locals & Travelers
          </h3>
          <p className="text-xs text-muted-foreground font-inter mb-5">Sourced from travel communities, Reddit, and real visitor experiences</p>
          <div className="space-y-4">
            {tips.local_advice.map((advice, i) => (
              <div key={i} className="bg-secondary/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-inter leading-relaxed text-foreground/90">"{advice.tip}"</p>
                    {advice.source && (
                      <p className="text-xs text-muted-foreground font-inter mt-2">
                        — {advice.source}
                        {advice.source_type && (
                          <Badge className={`ml-2 text-xs rounded-md border-0 ${advice.source_type === 'local' ? 'bg-emerald-50 text-emerald-700' : advice.source_type === 'reddit' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                            {advice.source_type}
                          </Badge>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Mistakes */}
      {tips.common_mistakes?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="font-inter font-semibold text-amber-800">Common Tourist Mistakes to Avoid</h4>
          </div>
          <ul className="space-y-2">
            {tips.common_mistakes.map((m, i) => (
              <li key={i} className="text-sm text-amber-800 font-inter flex items-start gap-2">
                <span>•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Community Links */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h4 className="font-inter font-semibold mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" /> More Real Traveler Advice
        </h4>
        <p className="text-sm text-muted-foreground font-inter mb-4">Read what real people say about visiting {destName}:</p>
        <div className="flex flex-wrap gap-3">
          <a href={redditUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl text-xs bg-orange-50 text-orange-700 border-orange-200">
              <ExternalLink className="w-3 h-3 mr-1.5" /> Reddit
            </Button>
          </a>
          <a href={tripadvisorUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl text-xs">
              <ExternalLink className="w-3 h-3 mr-1.5" /> TripAdvisor
            </Button>
          </a>
          <a href={lonelyPlanetUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl text-xs">
              <ExternalLink className="w-3 h-3 mr-1.5" /> Lonely Planet
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}