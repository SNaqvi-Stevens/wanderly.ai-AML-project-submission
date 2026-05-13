import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Bed, ExternalLink, Star, MapPin, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bookingDotComUrl, hostelworldUrl, airbnbUrl, hotelsDotComUrl } from "@/lib/bookingLinks";

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




// TODO (Production Upgrade): Replace LLM-generated accommodation data with Google Places API
// Endpoint: GET https://maps.googleapis.com/maps/api/place/textsearch/json
// Params: query ("hotels in {destination}"), type=lodging, key=GOOGLE_PLACES_API_KEY
// Store GOOGLE_PLACES_API_KEY in Base44 environment variables
// Call from a Base44 backend function (functions/searchAccommodations.js) to keep the key server-side
// Use Place Details endpoint for rating, photos, price_level, and website URL per property
// Hostelworld API (api.hostelworld.com) is the better source for hostels and dorm pricing specifically
// Map response to the same accommodations shape for zero UI changes needed

export default function AccommodationTab({ trip, content, preferences, destination, isStudentMode, departureDate, returnDate, onAccomSelect, selectedAccom }) {
  const [sortBy, setSortBy] = React.useState('price');
  const [filterTiers, setFilterTiers] = React.useState([]);
  const [showCustom, setShowCustom] = React.useState(false);
  const [customName, setCustomName] = React.useState('');
  const [customPrice, setCustomPrice] = React.useState('');

  const numTravelers = preferences?.num_travelers || 1;
  // Suggest rooms based on party size (1-2 = 1 room, 3-4 = 2, etc.)
  const suggestedRooms = Math.ceil(numTravelers / 2);
  const [numRooms, setNumRooms] = React.useState(suggestedRooms);

  const accommodations = content?.accommodations || [];
  const destName = trip?.destination_name || destination?.name || '';

  // Use exact selected dates
  const nights = departureDate && returnDate
    ? nightsBetween(departureDate, returnDate)
    : Math.max(1, (trip?.trip_length_days || 5) - 1);

  const toYMD = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const checkin = toYMD(departureDate);
  const checkout = toYMD(returnDate);
  
  const filtered = accommodations
    .filter(a => filterTiers.length === 0 || filterTiers.includes(a.tier_label))
    .sort((a, b) => {
      if (sortBy === 'price') return (a.price_per_night || 0) - (b.price_per_night || 0);
      if (sortBy === 'rating') return (b.star_or_guest_rating || 0) - (a.star_or_guest_rating || 0);
      if (sortBy === 'value') {
        const aValue = (a.star_or_guest_rating || 0) / (a.price_per_night || 1);
        const bValue = (b.star_or_guest_rating || 0) / (b.price_per_night || 1);
        return bValue - aValue;
      }
      return 0;
    });

  if (accommodations.length === 0 && filtered.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
          <Bed className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-playfair text-lg font-semibold mb-1">Find Where to Stay</h3>
          <p className="text-sm text-muted-foreground font-inter mb-5">Search for accommodation in {destName}:</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={bookingDotComUrl(destName, departureDate, returnDate)} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Booking.com</Button>
            </a>
            <a href={airbnbUrl(destName, departureDate, returnDate)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Airbnb</Button>
            </a>
            <a href={hostelworldUrl(destName, departureDate)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Hostelworld</Button>
            </a>
            <a href={hotelsDotComUrl(destName, departureDate, returnDate)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Hotels.com</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date banner */}
      {departureDate && returnDate && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
          <Bed className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm font-inter text-blue-800">
            <span className="font-semibold">Staying: </span>
            {showDate(departureDate)}
            {' → '}
            {showDate(returnDate)}
            <span className="ml-2 text-blue-600 text-xs">({nights} night{nights !== 1 ? 's' : ''})</span>
          </p>
        </div>
      )}
      {/* Rooms selector */}
      <div className="flex items-center gap-4 bg-card rounded-2xl px-5 py-4 shadow-sm border border-border">
        <Bed className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-inter font-semibold">Rooms needed</p>
          <p className="text-xs text-muted-foreground font-inter">{numTravelers} traveler{numTravelers !== 1 ? 's' : ''} — suggested: {suggestedRooms} room{suggestedRooms !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNumRooms(r => Math.max(1, r - 1))}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold hover:bg-secondary transition-colors"
          >−</button>
          <span className="text-lg font-inter font-bold w-6 text-center">{numRooms}</span>
          <button
            onClick={() => setNumRooms(r => Math.min(numTravelers, r + 1))}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-lg font-bold hover:bg-secondary transition-colors"
          >+</button>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price (Low to High)</SelectItem>
            <SelectItem value="rating">Rating (High to Low)</SelectItem>
            <SelectItem value="value">Best Value</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-3 items-center flex-wrap">
          {['Ultra Budget', 'Budget', 'Mid-Range', 'Boutique', 'Splurge'].map(tier => (
            <label key={tier} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={filterTiers.includes(tier)} onCheckedChange={v => setFilterTiers(v ? [...filterTiers, tier] : filterTiers.filter(t => t !== tier))} />
              <span className="text-sm font-inter">{tier}</span>
            </label>
          ))}
        </div>
        <Button size="sm" variant="outline" className="rounded-xl text-xs ml-auto" onClick={() => setShowCustom(!showCustom)}>
          <Plus className="w-3 h-3 mr-1.5" /> Add Custom Stay
        </Button>
      </div>

      {/* Custom accommodation input */}
      {showCustom && (
        <div className="bg-secondary/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-inter text-muted-foreground">Found accommodation elsewhere? Add it here:</p>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Property name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="flex-1 min-w-[200px] rounded-xl text-sm"
            />
            <Input
              type="number"
              placeholder="Price per night ($)"
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
              className="w-40 rounded-xl text-sm"
            />
            <Button
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => {
                if (customName && customPrice) {
                  const nights = Math.max(1, (trip?.trip_length_days || 5) - 1);
                  onAccomSelect?.({ name: customName, price_per_night: parseInt(customPrice), price_for_full_trip: parseInt(customPrice) * nights, _custom: true });
                  setCustomName('');
                  setCustomPrice('');
                  setShowCustom(false);
                }
              }}
              disabled={!customName || !customPrice}
            >
              Add Stay
            </Button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((accom, i) => {
          const tierColors = {
            'Ultra Budget': 'bg-slate-50 text-slate-700',
            'Budget': 'bg-emerald-50 text-emerald-700',
            'Mid-Range': 'bg-blue-50 text-blue-700',
            'Boutique': 'bg-purple-50 text-purple-700',
            'Splurge': 'bg-amber-50 text-amber-700',
          };
          const tripTotal = Math.round(accom.price_per_night * nights * numRooms);
          const rating = accom.star_or_guest_rating || accom.rating;
          return (
          <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
            {accom.is_best_value && (
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-primary text-primary-foreground border-0 rounded-lg text-xs font-inter">
                  <Star className="w-3 h-3 mr-1" /> Best Value
                </Badge>
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 mr-4">
                  <h4 className="font-inter font-semibold text-lg">{accom.name}</h4>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="rounded-lg text-xs font-inter">{accom.type?.replace(/_/g, ' ')}</Badge>
                    {accom.tier_label && (
                      <Badge className={`rounded-lg text-xs font-inter border-0 ${tierColors[accom.tier_label] || 'bg-secondary text-secondary-foreground'}`}>{accom.tier_label}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-inter font-bold">${accom.price_per_night}</div>
                  <div className="text-xs text-muted-foreground font-inter">/night</div>
                </div>
              </div>

              {accom.neighborhood && (
                <div className="flex items-start gap-1 mb-1">
                  <p className="text-sm text-muted-foreground font-inter">
                    📍 {accom.neighborhood}{accom.neighborhood_why ? ` — ${accom.neighborhood_why}` : (accom.neighborhood_desc ? ` — ${accom.neighborhood_desc}` : '')}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(`${accom.name}, ${destName}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 text-primary hover:text-primary/70 mt-0.5"
                    title="View on Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {rating && (
                <div className="flex items-center gap-1 text-sm font-inter mb-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-medium">{rating}</span>
                </div>
              )}

              {accom.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {accom.amenities.slice(0, 4).map((a, j) => (
                    <span key={j} className="px-2 py-1 bg-secondary/50 rounded-md text-xs font-inter">{a}</span>
                  ))}
                </div>
              )}

              <div className="text-sm text-primary font-inter font-medium mb-2">
                Total: ${tripTotal.toLocaleString()} for {nights} night{nights !== 1 ? 's' : ''} × {numRooms} room{numRooms !== 1 ? 's' : ''}
                {departureDate && returnDate && <span className="text-xs text-muted-foreground font-inter ml-1">({showDate(departureDate,{monthShort:true})} – {showDate(returnDate,{monthShort:true})})</span>}
              </div>

              {accom.lower_cost_note && (
                <p className="text-xs text-muted-foreground font-inter mb-4 italic">💡 {accom.lower_cost_note}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className={`rounded-xl text-xs ${selectedAccom?.name === accom.name ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  onClick={() => onAccomSelect?.({ ...accom, price_for_full_trip: tripTotal, _rooms: numRooms })}
                >
                  {selectedAccom?.name === accom.name ? '✓ Selected' : 'Select Stay'}
                </Button>
                <a href={bookingDotComUrl(destName, departureDate, returnDate, preferences?.num_travelers || 1)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Booking.com</Button>
                </a>
                <a href={airbnbUrl(destName, departureDate, returnDate, preferences?.num_travelers || 1)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Airbnb</Button>
                </a>
                {accom.type?.includes('hostel') && (
                  <a href={hostelworldUrl(destName, departureDate, returnDate, preferences?.num_travelers || 1)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Hostelworld</Button>
                  </a>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h4 className="font-inter font-semibold mb-3">Tips to Lower Accommodation Cost</h4>
        <ul className="space-y-2 text-sm text-muted-foreground font-inter">
          <li>🏨 Book directly with properties for 5-15% discounts</li>
          <li>📅 Check in Sunday or Monday for lower weekend rates</li>
          <li>📞 Ask about weekly rates for stays of 5+ nights</li>
          {isStudentMode && <li>🎒 Hostel dorm beds can save 50-70% vs private rooms</li>}
        </ul>
      </div>
    </div>
  );
}