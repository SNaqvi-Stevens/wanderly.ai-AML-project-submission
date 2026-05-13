import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sun, Sunrise, Moon, DollarSign, MapPin, Clock, Bus } from "lucide-react";
import ItineraryBudgetSuggestions from "./ItineraryBudgetSuggestions";
import ItineraryTripSummary from "./ItineraryTripSummary";
import ItineraryBudgetChart from "./ItineraryBudgetChart";

// showDate: displays a YYYY-MM-DD string exactly as selected — no Date conversion
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WEEKDAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const showDate = (s, opts = {}) => {
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mo, d] = m.map(Number);
  const monthName = opts.monthShort ? MONTHS_SHORT[mo-1] : MONTHS[mo-1];
  const day = d;
  if (opts.weekday) {
    // Calculate day of week without Date object using Zeller's congruence
    const yy = mo < 3 ? y - 1 : y;
    const mm = mo < 3 ? mo + 12 : mo;
    const dow = (d + Math.floor(13*(mm+1)/5) + yy + Math.floor(yy/4) - Math.floor(yy/100) + Math.floor(yy/400)) % 7;
    const wday = ((dow + 6) % 7); // 0=Mon
    const wdayAdj = (wday + 1) % 7; // 0=Sun
    const weekdayName = opts.weekdayShort ? WEEKDAYS_SHORT[wdayAdj] : WEEKDAYS[wdayAdj];
    return `${weekdayName}, ${monthName} ${day}, ${y}`;
  }
  if (opts.monthShort) return `${monthName} ${day}`;
  return `${monthName} ${day}, ${y}`;
};


const offsetDate = (ymd, days) => {
  if (!ymd) return '';
  const [y,m,d] = ymd.split('-').map(Number);
  const ms = Date.UTC(y, m-1, d) + days * 86400000;
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
  const dd = String(dt.getUTCDate()).padStart(2,'0');
  return `${yy}-${mm}-${dd}`;
};

const nightsBetween = (start, end) => {
  if (!start || !end) return null;
  const ms = (s) => { const [y,m,d] = s.split('-').map(Number); return Date.UTC(y,m-1,d); };
  return Math.round((ms(end) - ms(start)) / 86400000);
};



function mapsUrl(place, destination) {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${place}, ${destination}`)}`;
}

export default function ItineraryTab({ trip, content, preferences, destination, transportContent, itineraryTransportTotal: transportTotalOverride, budgetRemaining, flightBudget, accomBudget, allFlights, allAccommodations, departureDate, returnDate, selectedFlight, selectedAccom, onFlightSelect, onAccomSelect, notFlyingData, onNotFlyingSelect }) {

  const allDays = content?.itinerary || [];
  const itinerary = trip?.trip_length_days ? allDays.slice(0, trip.trip_length_days) : allDays;

  // Compute actual date for each day if departure is known
  const getDateForDay = (dayIndex) => {
    if (!departureDate) return null;
    try {
      const dateStr = offsetDate(departureDate, dayIndex);
      return showDate(dateStr, { weekday: true, monthShort: true });
    } catch { return null; }
  };
  const budget = preferences?.budget || trip?.user_budget_cap || 1000;
  const destName = trip?.destination_name || destination?.name || '';
  const dailyTransportCost = transportContent?.transport?.daily_transport_cost_usd || null;

  const numT = preferences?.num_travelers || 1;
  const nights = Math.max(1, (trip?.trip_length_days || 5) - 1);

  // Mirror exactly what ItineraryTripSummary uses as activeFlight/activeAccom
  const activeFlight = selectedFlight || (allFlights?.length > 0
    ? allFlights.reduce((a, b) => (a.estimated_price_per_person || 0) < (b.estimated_price_per_person || 0) ? a : b)
    : null);
  const activeAccom = selectedAccom || (allAccommodations?.length > 0
    ? allAccommodations.reduce((a, b) => (a.price_per_night || 0) < (b.price_per_night || 0) ? a : b)
    : null);

  // Compute costs exactly as ItineraryTripSummary does
  const effectiveFlightCost = activeFlight
    ? (activeFlight.estimated_price_per_person || activeFlight.price_per_person || 0) * numT
    : (flightBudget || 0);
  const effectiveAccomCost = activeAccom
    ? (activeAccom.price_for_full_trip || (activeAccom.price_per_night || 0) * nights)
    : (accomBudget || 0);

  let runningTotal = 0;
  const costMultiplier = numT; // scale all costs to full party total

  if (itinerary.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
        <Sun className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-xl font-semibold mb-2">Day-by-Day Itinerary</h3>
        <p className="text-sm text-muted-foreground font-inter">Your personalized itinerary is being crafted. Check back in a moment!</p>
      </div>
    );
  }

  // Recalculate budget remaining using effective flight/accom costs if selections changed
  // All AI-generated costs are per-person, so multiply by numT for party total
  const itinSpent = itinerary.length > 0
    ? (itinerary[itinerary.length - 1]?.running_total || itinerary.reduce((s, d) => s + (d.daily_spend_estimate || 0), 0))
    : null;
  const itinSpentTotal = itinSpent != null ? itinSpent * numT : null;
  const effectiveBudgetRemaining = itinSpentTotal != null
    ? budget - itinSpentTotal - effectiveFlightCost - effectiveAccomCost
    : budgetRemaining;

  return (
    <div className="space-y-6">
      {/* Date info banner */}
      {departureDate ? (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
          <Sun className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm font-inter text-blue-800">
            <span className="font-semibold">Trip dates: </span>
            {showDate(departureDate, { weekday: true })}
            {itinerary.length > 0 && (() => {
              const endDate = offsetDate(departureDate, itinerary.length - 1);
              return ` → ${showDate(endDate, { weekday: true })}`;
            })()}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
          <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-inter text-amber-800">
            <span className="font-semibold">No dates set — </span>go to the <span className="font-semibold">Flights</span> tab to pick your travel dates and see exact dates here.
          </p>
        </div>
      )}

      {/* Trip summary: selected flight + accommodation */}
      {(allFlights?.length > 0 || allAccommodations?.length > 0 || notFlyingData) && (
        <ItineraryTripSummary
          flights={allFlights}
          accommodations={allAccommodations}
          selectedFlight={selectedFlight}
          selectedAccom={selectedAccom}
          onFlightSelect={onFlightSelect}
          onAccomSelect={onAccomSelect}
          tripDays={trip?.trip_length_days || 5}
          numTravelers={numT}
          notFlyingData={notFlyingData}
          onNotFlyingSelect={onNotFlyingSelect}
          preferences={preferences}
          trip={trip}
          departureDate={departureDate}
        />
      )}

      {/* Budget remaining suggestions banner */}
      {effectiveBudgetRemaining != null && (
        <ItineraryBudgetSuggestions
          budgetRemaining={effectiveBudgetRemaining}
          trip={trip}
          preferences={preferences}
          destination={destination}
          flightBudget={effectiveFlightCost}
          accomBudget={effectiveAccomCost}
          itineraryDays={itinerary}
        />
      )}

      {itinerary.map((day, i) => {
        const dailySpend = (day.daily_spend_estimate || day.daily_total || 0) * numT;
        runningTotal = (day.running_total ? day.running_total * numT : runningTotal + dailySpend);
        const dayNum = day.day_number || day.day || (i + 1);
        const dayTitle = day.thematic_title || day.title || '';
        const actualDate = getDateForDay(i);
        const dayLabel = actualDate || day.date_label || `Day ${dayNum}`;
        return (
          <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
            {/* Day Header */}
            <div className="bg-primary/5 px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary text-primary-foreground rounded-lg text-sm font-inter px-3 py-1">
                  {dayLabel}
                </Badge>
                <h3 className="font-playfair text-lg font-semibold">{dayTitle}</h3>
              </div>
              <div className="text-right">
                <div className="text-sm font-inter font-bold">${dailySpend.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground font-inter">today {numT > 1 ? `(${numT} people)` : ''}</div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Morning */}
              {day.morning && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                    <Sun className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-inter text-amber-600 uppercase tracking-wider font-semibold">Morning</span>
                    {/* Main morning activity */}
                    <div className="mt-1 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-inter font-semibold">{day.morning.activity}</h4>
                            {day.morning.activity && (
                              <a href={mapsUrl(day.morning.activity, destName)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-primary hover:text-primary/70">
                                <MapPin className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          {(day.morning.estimated_cost || day.morning.cost) > 0 && (
                            <span className="text-sm font-inter font-medium text-muted-foreground">
                              ${((day.morning.estimated_cost || day.morning.cost) * numT).toLocaleString()}
                              {numT > 1 && <span className="text-xs ml-1 opacity-60">(×{numT})</span>}
                            </span>
                          )}
                        </div>
                        {day.morning.duration && <p className="text-xs text-primary/70 font-inter flex items-center gap-1"><Clock className="w-3 h-3" />{day.morning.duration}</p>}
                        <p className="text-sm text-muted-foreground font-inter mt-0.5 leading-relaxed">{day.morning.description}</p>
                      </div>
                      {/* Extra morning activities */}
                      {day.morning.extra_activities?.map((ea, ei) => (
                        <div key={ei} className="pl-3 border-l-2 border-amber-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-inter font-semibold text-sm">{ea.activity}</h4>
                              <a href={mapsUrl(ea.activity, destName)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-primary hover:text-primary/70">
                                <MapPin className="w-3 h-3" />
                              </a>
                            </div>
                            {ea.estimated_cost > 0 && <span className="text-xs font-inter font-medium text-muted-foreground">${(ea.estimated_cost * numT).toLocaleString()}{numT > 1 && <span className="opacity-60 ml-0.5">×{numT}</span>}</span>}
                          </div>
                          {ea.duration && <p className="text-xs text-primary/70 font-inter flex items-center gap-1"><Clock className="w-3 h-3" />{ea.duration}</p>}
                          {ea.description && <p className="text-xs text-muted-foreground font-inter mt-0.5">{ea.description}</p>}
                        </div>
                      ))}
                    </div>
                    {day.morning.transport_tip && <p className="text-xs text-primary font-inter mt-1.5 italic">🚌 {day.morning.transport_tip}</p>}
                  </div>
                </div>
              )}

              {/* Travel time: morning → afternoon */}
              {day.morning?.activity && day.afternoon?.activity && (
                <div className="flex items-center gap-2 ml-14 text-xs text-muted-foreground font-inter">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>Travel to next stop</span>
                  <a
                    href={`https://www.google.com/maps/dir/${encodeURIComponent(`${day.morning.activity}, ${destName}`)}/${encodeURIComponent(`${day.afternoon.activity}, ${destName}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >directions</a>
                </div>
              )}

              {/* Afternoon */}
              {day.afternoon && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <Sunrise className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-inter text-orange-600 uppercase tracking-wider font-semibold">Afternoon</span>
                    <div className="mt-1 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-inter font-semibold">{day.afternoon.activity}</h4>
                            {day.afternoon.activity && (
                              <a href={mapsUrl(day.afternoon.activity, destName)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-primary hover:text-primary/70">
                                <MapPin className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          {(day.afternoon.estimated_cost || day.afternoon.cost) > 0 && (
                            <span className="text-sm font-inter font-medium text-muted-foreground">
                              ${((day.afternoon.estimated_cost || day.afternoon.cost) * numT).toLocaleString()}
                              {numT > 1 && <span className="text-xs ml-1 opacity-60">(×{numT})</span>}
                            </span>
                          )}
                        </div>
                        {day.afternoon.duration && <p className="text-xs text-primary/70 font-inter flex items-center gap-1"><Clock className="w-3 h-3" />{day.afternoon.duration}</p>}
                        <p className="text-sm text-muted-foreground font-inter mt-0.5 leading-relaxed">{day.afternoon.description}</p>
                      </div>
                      {/* Extra afternoon activities */}
                      {day.afternoon.extra_activities?.map((ea, ei) => (
                        <div key={ei} className="pl-3 border-l-2 border-orange-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-inter font-semibold text-sm">{ea.activity}</h4>
                              <a href={mapsUrl(ea.activity, destName)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-primary hover:text-primary/70">
                                <MapPin className="w-3 h-3" />
                              </a>
                            </div>
                            {ea.estimated_cost > 0 && <span className="text-xs font-inter font-medium text-muted-foreground">${(ea.estimated_cost * numT).toLocaleString()}{numT > 1 && <span className="opacity-60 ml-0.5">×{numT}</span>}</span>}
                          </div>
                          {ea.duration && <p className="text-xs text-primary/70 font-inter flex items-center gap-1"><Clock className="w-3 h-3" />{ea.duration}</p>}
                          {ea.description && <p className="text-xs text-muted-foreground font-inter mt-0.5">{ea.description}</p>}
                        </div>
                      ))}
                    </div>
                    {day.afternoon.transport_tip && <p className="text-xs text-primary font-inter mt-1.5 italic">🚌 {day.afternoon.transport_tip}</p>}
                  </div>
                </div>
              )}

              {/* Travel time: afternoon → evening */}
              {day.afternoon?.activity && day.evening?.dinner_spot && (
                <div className="flex items-center gap-2 ml-14 text-xs text-muted-foreground font-inter">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>Travel to dinner</span>
                  <a
                    href={`https://www.google.com/maps/dir/${encodeURIComponent(`${day.afternoon.activity}, ${destName}`)}/${encodeURIComponent(`${day.evening.dinner_spot}, ${destName}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >directions</a>
                </div>
              )}

              {/* Evening */}
              {day.evening && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-inter text-indigo-600 uppercase tracking-wider font-semibold">Evening</span>
                      {day.evening.estimated_cost > 0 && (
                        <span className="text-sm font-inter font-medium text-muted-foreground">
                          ${(day.evening.estimated_cost * numT).toLocaleString()}
                          {numT > 1 && <span className="text-xs ml-1 opacity-60">(×{numT})</span>}
                        </span>
                      )}
                    </div>
                    {day.evening.dinner_spot && (
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-inter font-semibold">Dinner at {day.evening.dinner_spot}</h4>
                          <a href={mapsUrl(day.evening.dinner_spot, destName)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-primary hover:text-primary/70">
                            <MapPin className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {day.evening.cuisine && <p className="text-xs text-muted-foreground font-inter">{day.evening.cuisine}</p>}
                        {day.evening.duration && <p className="text-xs text-primary/70 font-inter flex items-center gap-1"><Clock className="w-3 h-3" />{day.evening.duration}</p>}
                      </div>
                    )}
                    {day.evening.evening_activity && (
                      <div className="flex items-center gap-2 mt-2 pl-3 border-l-2 border-indigo-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-inter font-semibold">{day.evening.evening_activity}</p>
                            <a href={mapsUrl(day.evening.evening_activity, destName)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-primary hover:text-primary/70">
                              <MapPin className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          {day.evening.evening_activity_duration && <p className="text-xs text-primary/70 font-inter flex items-center gap-1"><Clock className="w-3 h-3" />{day.evening.evening_activity_duration}</p>}
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground font-inter mt-1 leading-relaxed">{day.evening.description}</p>
                  </div>
                </div>
              )}

              {/* Transport note */}
              {day.transport_note && (
                <div className="bg-secondary/50 rounded-xl px-4 py-2.5 text-xs font-inter text-muted-foreground">
                  🗺️ {day.transport_note}
                </div>
              )}

              {/* Transport budget */}
              {(day.transport_cost_estimate || dailyTransportCost) && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-2.5">
                  <Bus className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-inter text-blue-700">
                    Transport budget: <span className="font-semibold">${day.transport_cost_estimate || dailyTransportCost}</span> est. for today
                  </span>
                </div>
              )}

              {/* Running Total */}
              <div className="pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-inter flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Running total through {dayLabel}
                </span>
                <span className={`text-sm font-inter font-bold ${runningTotal <= budget ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${runningTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Budget Breakdown Chart */}
      {(effectiveFlightCost > 0 || effectiveAccomCost > 0 || itinerary.length > 0) && (
        <ItineraryBudgetChart
          itineraryContent={content}
          flightBudget={effectiveFlightCost}
          accomBudget={effectiveAccomCost}
          budget={budget}
          numTravelers={numT}
        />
      )}

      {/* Grand Total Summary */}
      {(() => {
        // Use the same runningTotal accumulated in the day loop above for consistency
        const partyTotal = runningTotal;
        const activitiesPerPerson = itinerary.reduce((sum, day) => sum + (day.daily_spend_estimate || day.daily_total || 0), 0);
        const transportPerPerson = transportTotalOverride != null
          ? transportTotalOverride / numT
          : itinerary.reduce((sum, day) => sum + (day.transport_cost_estimate || dailyTransportCost || 0), 0);
        const perPersonTotal = activitiesPerPerson + transportPerPerson;
        const perDayAvg = Math.round(partyTotal / itinerary.length);

        // Full trip totals including flights & accommodation
        const flightTotal = effectiveFlightCost;
        const accomTotal = effectiveAccomCost;
        const grandTotalParty = partyTotal + flightTotal + accomTotal;
        const grandTotalPerPerson = Math.round(grandTotalParty / numT);


        return (
          <div className="space-y-4">
            {/* Activities + Transport subtotal */}
            <div className="bg-primary text-primary-foreground rounded-2xl p-6">
              <h4 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Itinerary Cost (Activities & Food)
              </h4>
              <div className={`grid gap-4 ${numT > 1 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                <div className="bg-white/10 rounded-xl p-4 border-2 border-white/30">
                  <div className="text-xs font-inter opacity-80 mb-1">Total for {numT > 1 ? `${numT} Travelers` : 'Trip'}</div>
                  <div className="text-2xl font-inter font-bold">${partyTotal.toLocaleString()}</div>
                  <div className="text-xs opacity-70 font-inter">over {itinerary.length} days</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs font-inter opacity-80 mb-1">Per Day (all travelers)</div>
                  <div className="text-2xl font-inter font-bold">${perDayAvg.toLocaleString()}</div>
                  <div className="text-xs opacity-70 font-inter">avg per day</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs font-inter opacity-80 mb-1">Per Person Total</div>
                  <div className="text-2xl font-inter font-bold">${Math.round(partyTotal / numT).toLocaleString()}</div>
                  <div className="text-xs opacity-70 font-inter">per traveler</div>
                </div>
                {numT > 1 && (
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-xs font-inter opacity-80 mb-1">Transport ({numT} travelers)</div>
                    <div className="text-2xl font-inter font-bold">${(transportPerPerson * numT).toLocaleString()}</div>
                    <div className="text-xs opacity-70 font-inter">local transport total</div>
                  </div>
                )}
              </div>
              <p className="text-xs opacity-70 font-inter mt-3">* Excludes flights & accommodation. Includes activities, food, and local transport.</p>
            </div>

            {/* Full Trip Grand Total */}
            <div className="bg-accent text-accent-foreground rounded-2xl p-6">
              <h4 className="font-inter font-bold text-lg mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Total Trip Cost — Everything Included
              </h4>
              <p className="text-xs opacity-70 font-inter mb-4">Flights + Accommodation + Activities/Food/Transport for {numT} traveler{numT !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-xl p-4 border-2 border-white/30 col-span-2 md:col-span-1">
                  <div className="text-xs font-inter opacity-80 mb-1">🌍 Grand Total</div>
                  <div className="text-3xl font-inter font-bold">${grandTotalParty.toLocaleString()}</div>
                  <div className="text-xs opacity-70 font-inter">{numT} traveler{numT !== 1 ? 's' : ''}, all-in</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs font-inter opacity-80 mb-1">✈️ Flights</div>
                  <div className="text-xl font-inter font-bold">${flightTotal.toLocaleString()}</div>
                  <div className="text-xs opacity-70 font-inter">{numT > 1 ? `$${Math.round(flightTotal/numT).toLocaleString()}/person` : 'round-trip'}</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs font-inter opacity-80 mb-1">🏨 Accommodation</div>
                  <div className="text-xl font-inter font-bold">${accomTotal.toLocaleString()}</div>
                  <div className="text-xs opacity-70 font-inter">full stay</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs font-inter opacity-80 mb-1">🗓️ Per Person Total</div>
                  <div className="text-xl font-inter font-bold">${grandTotalPerPerson.toLocaleString()}</div>
                  <div className="text-xs opacity-70 font-inter">per traveler, all-in</div>
                </div>
              </div>
              {(flightTotal === 0 || accomTotal === 0) && (
                <p className="text-xs opacity-60 font-inter mt-3">💡 Select a flight and accommodation above to see the complete total.</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}