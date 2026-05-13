import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plane, ExternalLink, GraduationCap, Brain, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { skyscannerUrl, expediaFlightsUrl, kayakFlightsUrl, studentUniverseUrl } from "@/lib/bookingLinks";
import AlternativeTransport from "./AlternativeTransport";

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

const nightsBetween = (start, end) => {
  if (!start || !end) return null;
  const ms = (s) => { const [y,m,d] = s.split('-').map(Number); return Date.UTC(y,m-1,d); };
  return Math.round((ms(end) - ms(start)) / 86400000);
};



// Seasonal price multipliers by month (index 0=Jan ... 11=Dec)
const SEASONAL_MULTIPLIERS = [0.88, 0.82, 0.90, 0.92, 0.95, 1.15, 1.25, 1.20, 1.05, 0.92, 0.85, 1.10];

function getSeasonalMultiplier(dateStr) {
  if (!dateStr) return 1;
  try {
    const month = dateStr ? parseInt(dateStr.split('-')[1], 10) - 1 : new Date().getMonth();
    return SEASONAL_MULTIPLIERS[month];
  } catch { return 1; }
}

export default function FlightsTab({ trip, content, preferences, destination, onFlightSelect, selectedFlight, departureDate, returnDate: returnDateProp, onTransportSelect }) {
  const [sortBy, setSortBy] = React.useState('price');
  const [filterStops, setFilterStops] = React.useState([]);
  const [showCustom, setShowCustom] = React.useState(false);
  const [customAirline, setCustomAirline] = React.useState('');
  const [customPrice, setCustomPrice] = React.useState('');

  const flights = content?.flights || [];
  const origin = preferences?.home_airport || preferences?.home_city || 'your city';
  const destName = trip?.destination_name || destination?.name || '';
  const isStudentMode = preferences?.budget && (preferences.budget / (preferences.num_travelers || 1)) < 500;

  // Trip dates — use explicit props first, then fall back to preferences/trip
  const departure = departureDate || preferences?.available_dates?.[0]?.start || trip?.trip_dates?.departure;
  const returnDate = returnDateProp || preferences?.available_dates?.[0]?.end || trip?.trip_dates?.return;

  // Seasonal multiplier based on departure month
  const seasonalMultiplier = getSeasonalMultiplier(departure);
  const formatDate = (d) => {
    if (!d) return null;
    try { return showDate(d); }
    catch { return d; }
  };

  const filtered = flights
    .filter(f => {
      if (filterStops.length === 0) return true;
      return filterStops.includes('nonstop') ? f.stops === 0 : f.stops > 0;
    })
    .sort((a, b) => {
      if (sortBy === 'price') return (a.estimated_price_per_person || 0) - (b.estimated_price_per_person || 0);
      if (sortBy === 'duration') return (a.total_flight_hours || 0) - (b.total_flight_hours || 0);
      if (sortBy === 'stops') return (a.stops || 0) - (b.stops || 0);
      return 0;
    });

  // Monthly price chart data — show prices across months with the user's trip dates highlighted
  const cheapestPrice = flights.length > 0 ? Math.min(...flights.map(f => f.estimated_price_per_person || f.price_per_person || 0)) : 0;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Seasonal multipliers (summer & holidays = peak, shoulder = mid, winter = low)
  const SEASONAL = [0.88, 0.82, 0.90, 0.92, 0.95, 1.15, 1.25, 1.20, 1.05, 0.92, 0.85, 1.10];
  const depMonthIdx = departure ? parseInt(departure.split('-')[1], 10) - 1 : null;
  const monthlyChartData = cheapestPrice > 0
    ? MONTHS.map((m, i) => ({
        month: m,
        price: Math.round(cheapestPrice * SEASONAL[i]),
        isYourTrip: i === depMonthIdx,
      }))
    : [];

  if (flights.length === 0 && filtered.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
          <Plane className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-playfair text-lg font-semibold mb-1">Search for Flights</h3>
          <p className="text-sm text-muted-foreground font-inter mb-5">Find the best fares for {destName} from {origin === 'your city' ? 'your location' : origin}:</p>
          {origin === 'your city' && <p className="text-xs text-amber-600 font-inter mb-4">Update your home airport in your profile for accurate flight links.</p>}
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={skyscannerUrl(preferences?.home_airport || '', destName, departure, returnDate, preferences?.num_travelers || 1)} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Skyscanner</Button>
            </a>
            <a href={expediaFlightsUrl(preferences?.home_airport || '', destName, departure, returnDate, preferences?.num_travelers || 1)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Expedia</Button>
            </a>
            <a href={kayakFlightsUrl(preferences?.home_airport || preferences?.home_city || '', destName, departure, returnDate)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Kayak</Button>
            </a>
            <a href={studentUniverseUrl()} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl"><GraduationCap className="w-4 h-4 mr-2" /> Student Universe</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI / ML flag */}
      <div className="flex items-center gap-2.5 bg-primary/8 border border-primary/20 rounded-2xl px-5 py-3">
        <Brain className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs text-muted-foreground font-inter">
          <span className="text-primary font-semibold">AI-estimated prices</span> — generated by our AI model based on typical fares for this route and season. Click "Book" links for live prices.
        </p>
      </div>

      {/* Trip dates banner */}
      {(departure || returnDate) && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
          <Plane className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="text-sm font-inter text-blue-800">
            <span className="font-semibold">Your trip: </span>
            {formatDate(departure)} {returnDate ? `→ ${formatDate(returnDate)}` : ''}
            {departure && returnDate && (() => {
              const days = nightsBetween(departure, returnDate) || 0;
              return days > 0 ? <span className="ml-2 text-blue-600 text-xs">({days} nights)</span> : null;
            })()}
          </div>
        </div>
      )}

      {/* Monthly price trend chart */}
      {monthlyChartData.length > 0 && (
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h4 className="font-inter font-semibold mb-1 flex items-center gap-2">
            Price Trends by Month
            <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
              <Brain className="w-3 h-3" /> AI Estimates
            </span>
          </h4>
          <p className="text-xs text-muted-foreground font-inter mb-1">Estimated round-trip per person • {origin} → {destName}</p>
          {(departure || returnDate) && (
            <p className="text-xs font-inter mb-4">
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                ✈️ Your trip: {departure ? formatDate(departure) : ''}{returnDate ? ` → ${formatDate(returnDate)}` : ''}
              </span>
            </p>
          )}
          {!(departure || returnDate) && <div className="mb-4" />}
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" stroke="#6b7280" tick={({ x, y, payload }) => {
                const isTrip = monthlyChartData[payload.index]?.isYourTrip;
                return (
                  <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={isTrip ? 'hsl(var(--primary))' : '#6b7280'} fontWeight={isTrip ? 700 : 400}>
                    {payload.value}
                  </text>
                );
              }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} width={52} />
              <Tooltip
                formatter={(v, name, props) => [`$${v.toLocaleString()}${props.payload?.isYourTrip ? ' ← Your trip' : ''}`, 'Est. price/person']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              {depMonthIdx !== null && (
                <ReferenceLine x={MONTHS[depMonthIdx]} stroke="hsl(var(--primary))" strokeDasharray="4 2" label={{ value: 'Your trip', position: 'top', fontSize: 10, fill: 'hsl(var(--primary))' }} />
              )}
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isYourTrip) {
                    return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={6} fill="hsl(var(--primary))" stroke="white" strokeWidth={2} />;
                  }
                  return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
                }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {depMonthIdx !== null && (
            <p className="text-xs text-primary font-inter mt-2 text-center font-semibold">
              ● Highlighted month = your departure ({MONTHS[depMonthIdx]}) · Est. ${monthlyChartData[depMonthIdx]?.price?.toLocaleString()} / person
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price (Low to High)</SelectItem>
            <SelectItem value="duration">Duration (Shortest)</SelectItem>
            <SelectItem value="stops">Fewest Stops</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={filterStops.includes('nonstop')} onCheckedChange={v => setFilterStops(v ? ['nonstop'] : [])} />
          <span className="text-sm font-inter">Nonstop only</span>
        </label>
        <Button size="sm" variant="outline" className="rounded-xl text-xs ml-auto" onClick={() => setShowCustom(!showCustom)}>
          <Plus className="w-3 h-3 mr-1.5" /> Add Custom Flight
        </Button>
      </div>

      {/* Custom flight input */}
      {showCustom && (
        <div className="bg-secondary/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-inter text-muted-foreground">Found a flight elsewhere? Add it here:</p>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Airline (e.g., United 12345)"
              value={customAirline}
              onChange={e => setCustomAirline(e.target.value)}
              className="flex-1 min-w-[200px] rounded-xl text-sm"
            />
            <Input
              type="number"
              placeholder="Price per person ($)"
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
              className="w-32 rounded-xl text-sm"
            />
            <Button
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => {
                if (customAirline && customPrice) {
                  onFlightSelect({ airline: customAirline, estimated_price_per_person: parseInt(customPrice), _key: customAirline + '_' + customPrice, _custom: true });
                  setCustomAirline('');
                  setCustomPrice('');
                  setShowCustom(false);
                }
              }}
              disabled={!customAirline || !customPrice}
            >
              Add Flight
            </Button>
          </div>
        </div>
      )}

      {/* Flight cards */}
      <div className="grid gap-4">
        {filtered.map((flight, i) => {
          const basePrice = flight.estimated_price_per_person || flight.price_per_person || 0;
          const price = departure ? Math.round(basePrice * seasonalMultiplier) : basePrice;
          const numT = preferences?.num_travelers || 1;
          const isSelected = selectedFlight && selectedFlight === flight.airline + '_' + (flight.estimated_price_per_person || flight.price_per_person || 0);
          return (
            <div key={i} className={`bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 ${isSelected ? 'border-primary' : 'border-transparent'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Plane className="w-5 h-5 text-primary" />
                    <span className="font-inter font-semibold">{flight.airline}</span>
                    {flight.budget_airline && <Badge className="rounded-lg text-xs font-inter bg-amber-50 text-amber-700">Budget Airline</Badge>}
                    {flight.badge && (
                      <Badge className={`rounded-lg text-xs font-inter ${flight.badge === 'Cheapest' ? 'bg-emerald-50 text-emerald-700' : flight.badge === 'Fastest' ? 'bg-blue-50 text-blue-700' : flight.badge === 'Student Pick' ? 'bg-purple-50 text-purple-700' : 'bg-primary/10 text-primary'}`}>
                        {flight.badge}
                      </Badge>
                    )}
                    {isSelected && <Badge className="rounded-lg text-xs font-inter bg-primary text-primary-foreground">Selected for itinerary</Badge>}
                  </div>
                  <p className="text-lg font-inter font-bold">{flight.route || `${origin} → ${destName}`}</p>
                  {(departure || returnDate) && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {departure && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 font-inter font-semibold px-2 py-0.5 rounded-md">
                          ✈️ Depart: {formatDate(departure)}
                        </span>
                      )}
                      {returnDate && (
                        <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 font-inter font-semibold px-2 py-0.5 rounded-md">
                          🔁 Return: {formatDate(returnDate)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground font-inter">
                    <span>{flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}${flight.layover_city ? ` via ${flight.layover_city}` : ''}`}</span>
                    {flight.total_flight_hours && <><span>•</span><span>{flight.total_flight_hours}h total</span></>}
                    {flight.baggage_included === false && <span className="text-amber-600">• Bags extra</span>}
                    {flight.baggage_included === true && <span className="text-emerald-600">• Bags included</span>}
                  </div>
                  
                  {flight.book_in_advance && <p className="text-xs text-muted-foreground font-inter mt-1 italic">📅 {flight.book_in_advance}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {numT > 1 ? (
                    <>
                      <div className="text-3xl font-inter font-bold">${(price * numT).toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground font-inter">total ({numT} travelers)</div>
                      <div className="text-xs text-muted-foreground font-inter mt-0.5">${price.toLocaleString()} /person</div>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-inter font-bold">${price.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground font-inter">per person</div>
                    </>
                  )}
                  {departure && seasonalMultiplier !== 1 && (
                    <div className="text-xs font-inter mt-0.5" style={{color: seasonalMultiplier > 1 ? '#f59e0b' : '#10b981'}}>
                      {seasonalMultiplier > 1 ? `↑ peak season` : `↓ off-peak deal`}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {onFlightSelect && (
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className="rounded-xl text-xs"
                    onClick={() => onFlightSelect(isSelected ? null : { ...flight, _key: flight.airline + '_' + price })}
                  >
                    {isSelected ? '✓ Selected' : 'Use for itinerary'}
                  </Button>
                )}
                <a href={skyscannerUrl(preferences?.home_airport || '', destName, departure, returnDate, preferences?.num_travelers || 1)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Skyscanner</Button>
                </a>
                <a href={expediaFlightsUrl(preferences?.home_airport || '', destName, departure, returnDate, preferences?.num_travelers || 1)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Expedia</Button>
                </a>
                <a href={kayakFlightsUrl(preferences?.home_airport || preferences?.home_city || '', destName, departure, returnDate)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Kayak</Button>
                </a>
                {flight.student_universe_available && (
                  <a href={studentUniverseUrl()} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs bg-purple-50 text-purple-700 border-purple-200"><GraduationCap className="w-3 h-3 mr-1.5" /> Student Universe</Button>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Student tip */}
      {isStudentMode && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h4 className="font-inter font-semibold text-primary">Student Flight Deals</h4>
          </div>
          <p className="text-sm text-muted-foreground font-inter mb-3">Check Student Universe for exclusive student fares on this route.</p>
          <a href={studentUniverseUrl()} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="rounded-xl"><ExternalLink className="w-3 h-3 mr-1.5" /> Student Universe</Button>
          </a>
        </div>
      )}

      {/* Tips */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h4 className="font-inter font-semibold mb-3">Flight Tips</h4>
        <ul className="space-y-2 text-sm text-muted-foreground font-inter">
          <li>✈️ Tuesday and Wednesday departures are typically 15-20% cheaper</li>
          <li>📅 Book 6-8 weeks in advance for the best domestic fares</li>
          <li>🧳 Budget airlines may charge extra for checked bags — pack light!</li>
        </ul>
      </div>

      {/* Total cost summary */}
      {filtered.length > 0 && (() => {
        const numT = preferences?.num_travelers || 1;
        const cheapest = Math.min(...flights.map(f => f.estimated_price_per_person || f.price_per_person || 0));
        const mostExpensive = Math.max(...flights.map(f => f.estimated_price_per_person || f.price_per_person || 0));
        return (
          <div className="bg-primary text-primary-foreground rounded-2xl p-6">
            <h4 className="font-inter font-bold text-lg mb-4 flex items-center gap-2">
              <Plane className="w-5 h-5" /> Round-Trip Flight Cost Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-xs font-inter opacity-80 mb-1">Cheapest Option</div>
                <div className="text-2xl font-inter font-bold">${cheapest.toLocaleString()}</div>
                <div className="text-xs opacity-70 font-inter">per person</div>
                {numT > 1 && <div className="text-sm font-inter font-semibold mt-1">${(cheapest * numT).toLocaleString()} for {numT} travelers</div>}
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-xs font-inter opacity-80 mb-1">Most Expensive</div>
                <div className="text-2xl font-inter font-bold">${mostExpensive.toLocaleString()}</div>
                <div className="text-xs opacity-70 font-inter">per person</div>
                {numT > 1 && <div className="text-sm font-inter font-semibold mt-1">${(mostExpensive * numT).toLocaleString()} for {numT} travelers</div>}
              </div>
              <div className="bg-white/10 rounded-xl p-4 col-span-2 md:col-span-1">
                <div className="text-xs font-inter opacity-80 mb-1">Price Range</div>
                <div className="text-xl font-inter font-bold">${cheapest.toLocaleString()} – ${mostExpensive.toLocaleString()}</div>
                <div className="text-xs opacity-70 font-inter">per person round-trip</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ALTERNATIVE TRANSPORT SECTION ─────────────────────────────────── */}
      <AlternativeTransport
        preferences={preferences}
        trip={trip}
        destination={destination}
        departure={departure}
        returnDate={returnDate}
        onTransportSelect={onTransportSelect}
      />

    </div>
  );
}