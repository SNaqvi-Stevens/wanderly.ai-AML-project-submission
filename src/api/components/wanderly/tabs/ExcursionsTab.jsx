import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Star, MapPin, Clock, Compass } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getYourGuideUrl, viatorUrl, googleMapsUrl } from "@/lib/bookingLinks";

export default function ExcursionsTab({ trip, content, preferences, destination, isStudentMode }) {
  const [sortBy, setSortBy] = React.useState('price');
  const [filterCategories, setFilterCategories] = React.useState([]);
  
  const excursions = content?.excursions || [];
  const destName = trip?.destination_name || destination?.name || '';
  const numTravelers = preferences?.num_travelers || 1;
  
  const filtered = excursions
    .filter(e => filterCategories.length === 0 || filterCategories.includes(e.category))
    .sort((a, b) => {
      if (sortBy === 'price') return (a.price_per_person || 0) - (b.price_per_person || 0);
      if (sortBy === 'duration') return (a.duration_hours || 0) - (b.duration_hours || 0);
      return 0;
    });

  const mustDo = excursions.filter(e => e.category === 'must_do' || e.is_top_pick);
  const free = excursions.filter(e => e.category === 'free' || e.price_per_person === 0);
  const paid = excursions.filter(e => (e.category === 'paid' || e.category === 'budget_paid' || e.category === 'mid_paid' || e.category === 'cultural' || e.category === 'adventure' || e.category === 'nature' || e.category === 'family' || e.category === 'food_experience') && e.price_per_person > 0 && !e.is_top_pick);
  const splurge = excursions.filter(e => e.category === 'splurge');

  const ExcursionCard = ({ excursion }) => (
    <div className="bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-inter font-semibold">{excursion.name}</h4>
            {excursion.category === 'must_do' && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs rounded-lg">
                <Star className="w-3 h-3 mr-0.5" /> Must-Do
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-inter leading-relaxed">{excursion.description}</p>
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground font-inter flex-wrap">
            {(excursion.duration_hours || excursion.duration) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {excursion.duration_hours ? `${excursion.duration_hours}h` : excursion.duration}</span>}
            {(excursion.best_time_of_day || excursion.best_time) && <span>Best: {excursion.best_time_of_day || excursion.best_time}</span>}
            {excursion.difficulty && <span>• {excursion.difficulty}</span>}
            {excursion.advance_booking_required && <span className="text-amber-600">• Book ahead</span>}
          </div>
          {excursion.lower_cost_alternative && (
            <p className="text-xs text-muted-foreground font-inter mt-1.5 italic">💡 {excursion.lower_cost_alternative}</p>
          )}
        </div>
        <div className="text-right ml-4">
          {excursion.price_per_person === 0 || excursion.category === 'free' ? (
            <span className="text-lg font-inter font-bold text-primary">FREE</span>
          ) : (
            <>
              <div className="text-xl font-inter font-bold">${(excursion.price_per_person * numTravelers).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground font-inter">{numTravelers > 1 ? `total (${numTravelers} ppl)` : '/person'}</div>
              {numTravelers > 1 && <div className="text-xs text-muted-foreground font-inter">${excursion.price_per_person} /person</div>}
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t flex-wrap items-center">
        {excursion.booking_platform === 'free_no_booking' || (excursion.price_per_person === 0 && excursion.category === 'free') ? (
          <a href={googleMapsUrl(`${excursion.name} ${destName}`)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl text-xs"><MapPin className="w-3 h-3 mr-1.5" /> Google Maps</Button>
          </a>
        ) : (
          <>
            {excursion.booking_platform !== 'viator' && (
              <a href={`https://www.getyourguide.com/search?q=${encodeURIComponent(excursion.search_query_for_platform || excursion.name)}&location=${encodeURIComponent(destName)}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> GetYourGuide</Button>
              </a>
            )}
            {excursion.booking_platform !== 'getyourguide' && (
              <a href={`https://www.viator.com/searchResults/all?text=${encodeURIComponent(excursion.search_query_for_platform || excursion.name)}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Viator</Button>
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (excursions.length === 0 && filtered.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
        <Compass className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-lg font-semibold mb-1">Find Activities & Excursions</h3>
        <p className="text-sm text-muted-foreground font-inter mb-5">Browse things to do in {destName}:</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href={getYourGuideUrl(destName, '')} target="_blank" rel="noopener noreferrer">
            <Button className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> GetYourGuide</Button>
          </a>
          <a href={viatorUrl(destName, '')} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Viator</Button>
          </a>
          <a href={googleMapsUrl(`things to do in ${destName}`)} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-xl"><MapPin className="w-4 h-4 mr-2" /> Google Maps</Button>
          </a>
        </div>
      </div>
    );
  }

  // Sort: free first if student mode
  const orderedSections = isStudentMode
    ? [
        { title: "🆓 Free & Low Cost Activities", items: free },
        { title: "⭐ Must-Do Experiences", items: mustDo },
        { title: "🎫 Paid Excursions", items: paid },
        { title: "✨ Splurge Experiences", items: splurge },
      ]
    : [
        { title: "⭐ Must-Do Experiences", items: mustDo },
        { title: "🆓 Free & Low Cost Activities", items: free },
        { title: "🎫 Paid Excursions", items: paid },
        { title: "✨ Splurge Experiences", items: splurge },
      ];

  return (
    <div className="space-y-8">
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price (Low to High)</SelectItem>
            <SelectItem value="duration">Duration (Shortest)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-3 items-center flex-wrap">
          {['must_do', 'free', 'budget_paid', 'mid_paid', 'splurge', 'adventure', 'cultural', 'nature'].map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={filterCategories.includes(cat)} onCheckedChange={v => setFilterCategories(v ? [...filterCategories, cat] : filterCategories.filter(c => c !== cat))} />
              <span className="text-sm font-inter">{cat === 'budget_paid' ? 'Budget' : cat === 'mid_paid' ? 'Mid-Range' : cat.replace(/_/g, '-')}</span>
            </label>
          ))}
        </div>
      </div>
      {filtered.length > 0 ? (
        <>
          {orderedSections.map(section => {
            const filtered = section.items.filter(e => filterCategories.length === 0 || filterCategories.includes(e.category));
            return filtered.length > 0 ? (
              <div key={section.title}>
                <h3 className="font-playfair text-xl font-semibold mb-4">{section.title}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {filtered.sort((a, b) => {
                    if (sortBy === 'price') return (a.price_per_person || 0) - (b.price_per_person || 0);
                    if (sortBy === 'duration') return (a.duration_hours || 0) - (b.duration_hours || 0);
                    return 0;
                  }).map((e, i) => <ExcursionCard key={i} excursion={e} />)}
                </div>
              </div>
            ) : null;
          })}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">No activities match your filters.</div>
      )}

      {/* Budget summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
        <h4 className="font-inter font-semibold text-primary mb-2">Activities Budget Summary</h4>
        <p className="text-sm font-inter text-muted-foreground">
          Selecting {mustDo.length + free.length} must-do and free activities keeps your activities spend minimal. 
          {paid.length > 0 && ` Adding ${paid.length} paid excursions would cost approximately $${paid.reduce((s, e) => s + (e.price_per_person || 0), 0) * numTravelers} total${numTravelers > 1 ? ` ($${paid.reduce((s, e) => s + (e.price_per_person || 0), 0)} per person × ${numTravelers})` : ''}.`}
        </p>
      </div>
    </div>
  );
}