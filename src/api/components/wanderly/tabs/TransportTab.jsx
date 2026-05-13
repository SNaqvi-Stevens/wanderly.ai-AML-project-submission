import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Car, Train, Bus, MapPin, Bike, Ship, Navigation } from "lucide-react";
import { uberUrl, googleMapsUrl } from "@/lib/bookingLinks";

const VEHICLE_ICONS = {
  bus: Bus, train: Train, car: Car, scooter: Bike, taxi: Car, bicycle: Bike, ferry: Ship, tuk_tuk: Car
};

function VehicleCard({ v }) {
  const Icon = VEHICLE_ICONS[v.icon] || Car;
  return (
    <div className={`bg-card rounded-2xl p-5 shadow-sm border-2 transition-all ${v.recommended ? 'border-primary' : 'border-transparent'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-inter font-semibold text-sm">{v.type}</div>
            {v.recommended && <Badge className="bg-primary/10 text-primary border-0 rounded-md text-xs font-inter px-1.5 py-0">Recommended</Badge>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-inter font-bold">${v.daily_cost_usd}</div>
          <div className="text-xs text-muted-foreground font-inter">/day</div>
        </div>
      </div>
      <div className="space-y-1 mb-3">
        {v.pros && <p className="text-xs text-emerald-700 font-inter">✓ {v.pros}</p>}
        {v.cons && <p className="text-xs text-muted-foreground font-inter">✗ {v.cons}</p>}
      </div>
      {v.booking_tip && <p className="text-xs italic text-muted-foreground font-inter">💡 {v.booking_tip}</p>}
    </div>
  );
}

export default function TransportTab({ trip, content, preferences, destination, itineraryContent }) {
  const transport = content?.transport || {};
  const destName = trip?.destination_name || destination?.name || '';
  const days = trip?.trip_length_days || 5;

  // Use itinerary-derived transport costs if available (more accurate, per-day breakdown)
  const itineraryDays = itineraryContent?.itinerary || [];
  const itineraryTransportTotal = itineraryDays.length > 0
    ? itineraryDays.reduce((sum, day) => sum + (day.transport_cost_estimate || 0), 0)
    : null;
  const itineraryDailyAvg = itineraryTransportTotal !== null && itineraryDays.length > 0
    ? Math.round(itineraryTransportTotal / itineraryDays.length)
    : null;

  // Always derive costs from itinerary for consistency with ItineraryTab
  const dailyCost = itineraryDailyAvg ?? transport.daily_transport_cost_usd ?? 10;
  const totalCost = itineraryTransportTotal ?? transport.total_transport_estimate_usd ?? (dailyCost * days);
  // Use the exact same total as ItineraryTab: sum of per-day transport_cost_estimate
  const canonicalTotal = itineraryTransportTotal ?? totalCost;

  if (!transport.airport_transfer_options?.length && !transport.daily_transport_recommendation) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
        <Bus className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-lg font-semibold mb-1">Getting Around {destName}</h3>
        <p className="text-sm text-muted-foreground font-inter mb-5">Plan your transportation:</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href={uberUrl()} target="_blank" rel="noopener noreferrer">
            <Button className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Uber</Button>
          </a>
          <a href={googleMapsUrl(`${destName} transit`)} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-xl"><MapPin className="w-4 h-4 mr-2" /> Google Maps Transit</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Airport Transfer */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-4">✈️ Airport Transfer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(transport.airport_transfer_options || []).map((opt, i) => (
            <div key={i} className="bg-secondary/50 rounded-xl p-4">
              <div className="text-sm font-inter font-semibold">{opt.method}</div>
              <div className="text-lg font-inter font-bold text-primary">${opt.estimated_cost_usd}</div>
              <div className="text-xs text-muted-foreground font-inter mt-1">{opt.description}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <a href={uberUrl()} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Uber</Button>
          </a>
          <a href={googleMapsUrl(`${destName} airport transit`)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl text-xs"><MapPin className="w-3 h-3 mr-1.5" /> Transit Map</Button>
          </a>
        </div>
      </div>

      {/* Vehicle Options */}
      {transport.vehicle_options?.length > 0 && (
        <div>
          <h3 className="font-playfair text-xl font-semibold mb-4">🚗 Transport Options & Estimated Costs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {transport.vehicle_options.map((v, i) => <VehicleCard key={i} v={v} />)}
          </div>
        </div>
      )}

      {/* Daily Transportation */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-4">🚌 Getting Around Daily</h3>
        <p className="text-sm text-muted-foreground font-inter mb-3">{transport.daily_transport_recommendation || 'Public transit and walking are the best options.'}</p>
        {transport.budget_tip && <p className="text-xs italic text-muted-foreground font-inter mb-3">💡 {transport.budget_tip}</p>}
      </div>

      {/* Itinerary-based Budget Estimate */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6">
        <h3 className="font-playfair text-xl font-bold mb-1">📍 Based on Your Itinerary</h3>
        <p className="text-sm opacity-80 font-inter mb-5">Estimated local transport cost across all {days} days</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-xs font-inter opacity-80 mb-1">Daily Average</div>
            <div className="text-2xl font-inter font-bold">${dailyCost}</div>
            <div className="text-xs opacity-70 font-inter">per day</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-xs font-inter opacity-80 mb-1">Trip Total</div>
            <div className="text-2xl font-inter font-bold">${canonicalTotal}</div>
            <div className="text-xs opacity-70 font-inter">over {days} days</div>
          </div>
          <div className="bg-white/20 rounded-xl p-4 border-2 border-white/40 col-span-2 md:col-span-1">
            <div className="text-xs font-inter opacity-80 mb-1">💰 Budget with 10% Buffer</div>
            <div className="text-2xl font-inter font-bold">${Math.ceil(canonicalTotal * 1.1)}</div>
            <div className="text-xs opacity-70 font-inter">recommended budget</div>
          </div>
        </div>
        {itineraryTransportTotal !== null && (
          <p className="text-xs opacity-70 font-inter italic">Figures derived from per-day transport estimates in your itinerary. The 10% buffer covers unexpected rides, delays, or detours.</p>
        )}
      </div>

      {/* Tips */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-4">💡 Navigation Tips</h3>
        <ul className="space-y-3">
          {(transport.local_apps?.length > 0 ? transport.local_apps.map(a => `Use ${a}`) : [
            "Download offline maps before you arrive",
            "Check if the city has a transit day pass for savings",
            "Walking is often the best way to explore the city center",
          ]).map((tip, i) => (
            <li key={i} className="text-sm font-inter text-muted-foreground flex items-start gap-2">
              <span className="text-primary">•</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}