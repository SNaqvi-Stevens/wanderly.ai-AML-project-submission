import React, { useState } from "react";
import { Plane, Bed, ChevronDown, ChevronUp, Check, Plus, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AlternativeTransport from "./AlternativeTransport";

export default function ItineraryTripSummary({
  flights,
  accommodations,
  selectedFlight,
  selectedAccom,
  onFlightSelect,
  onAccomSelect,
  tripDays,
  numTravelers,
  notFlyingData,
  onNotFlyingSelect,
  preferences,
  trip,
  departureDate,
}) {
  const [flightOpen, setFlightOpen] = useState(false);
  const [accomOpen, setAccomOpen] = useState(false);
  const [customFlightOpen, setCustomFlightOpen] = useState(false);
  const [customAccomOpen, setCustomAccomOpen] = useState(false);
  const [customFlightData, setCustomFlightData] = useState({ airline: '', price: '' });
  const [customAccomData, setCustomAccomData] = useState({ name: '', price: '' });
  const [notFlyingOpen, setNotFlyingOpen] = useState(false);

  // "Not flying" selected means selectedFlight is the special sentinel
  const isNotFlying = selectedFlight?._notFlying === true;

  const activeFlight = isNotFlying ? null : (selectedFlight || (flights?.length > 0
    ? flights.reduce((a, b) =>
        (a.estimated_price_per_person || 0) < (b.estimated_price_per_person || 0) ? a : b)
    : null));

  const activeAccom = selectedAccom || (accommodations?.length > 0
    ? accommodations.reduce((a, b) =>
        (a.price_per_night || 0) < (b.price_per_night || 0) ? a : b)
    : null);

  const nights = Math.max(1, (tripDays || 5) - 1);
  const numT = numTravelers || 1;

  const flightPrice = activeFlight ? (activeFlight.estimated_price_per_person || activeFlight.price_per_person || 0) : 0;
  const flightTotal = flightPrice * numT;
  const accomTotal = activeAccom ? (activeAccom.price_for_full_trip || (activeAccom.price_per_night || 0) * nights) : 0;

  // Cost for "not flying" selection
  const notFlyingTotal = notFlyingData?.totalCost || 0;
  const transportCostForTotal = isNotFlying ? notFlyingTotal : flightTotal;

  if (!activeFlight && !activeAccom && !isNotFlying && !notFlyingData && flights?.length === 0 && accommodations?.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-secondary/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide font-inter">Trip Selections</p>
      </div>

      <div className="divide-y divide-border">
        {/* Flight / Transport row */}
        {(flights?.length > 0 || notFlyingData) && (
          <div>
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors"
              onClick={() => setFlightOpen(o => !o)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isNotFlying ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                  {isNotFlying
                    ? <Car className="w-4 h-4 text-emerald-600" />
                    : <Plane className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground font-inter">{isNotFlying ? 'Alternative Transport' : 'Selected Flight'}</p>
                  <p className="text-sm font-semibold font-inter">
                    {isNotFlying
                      ? (notFlyingData?.label || 'Not Flying')
                      : (activeFlight?.airline || '—')}
                  </p>
                  <p className="text-xs text-muted-foreground font-inter">
                    {isNotFlying
                      ? `$${notFlyingTotal.toLocaleString()} total${notFlyingData?.details?.hours ? ` · ${notFlyingData.details.hours}h drive` : ''}`
                      : (activeFlight ? `$${flightPrice.toLocaleString()}/person` : '')}
                    {!isNotFlying && numT > 1 && activeFlight ? ` · $${flightTotal.toLocaleString()} total` : ''}
                    {!selectedFlight && activeFlight && !isNotFlying && <span className="ml-1 text-emerald-600 font-medium">(lowest price)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-inter">${transportCostForTotal.toLocaleString()}</span>
                {flightOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {flightOpen && (
              <div className="px-5 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground font-inter mb-2">Select a flight or transport option:</p>

                {/* Flight options */}
                {flights?.map((f, i) => {
                  const price = f.estimated_price_per_person || f.price_per_person || 0;
                  const isActive = !isNotFlying && activeFlight?.airline === f.airline && (activeFlight?.estimated_price_per_person || activeFlight?.price_per_person) === price;
                  return (
                    <button
                      key={i}
                      onClick={() => { onFlightSelect(f); setFlightOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors text-left ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-secondary/40'}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Plane className="w-3.5 h-3.5 text-blue-400" />
                          <p className="text-sm font-semibold font-inter">{f.airline}</p>
                          {f.badge && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-inter font-medium">{f.badge}</span>}
                          {!selectedFlight && isActive && <span className="text-xs text-emerald-600 font-inter">(default)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground font-inter">
                          {f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}
                          {f.total_flight_hours ? ` · ${f.total_flight_hours}h` : ''}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold font-inter">${price.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground font-inter">per person</p>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </button>
                  );
                })}

                {/* "Not Flying" option */}
                <div className={`rounded-xl border-2 transition-colors ${isNotFlying ? 'border-emerald-500 bg-emerald-50/50' : 'border-border'}`}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setNotFlyingOpen(o => !o)}
                  >
                    <div className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-semibold font-inter">
                          Not Flying
                          {isNotFlying && <span className="ml-2 text-xs text-emerald-600">(selected)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground font-inter">
                          {notFlyingData
                            ? `${notFlyingData.label} · $${notFlyingData.totalCost.toLocaleString()} total`
                            : 'Drive or take alternate transport'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notFlyingData && <span className="text-sm font-bold font-inter">${notFlyingData.totalCost.toLocaleString()}</span>}
                      {isNotFlying && <Check className="w-4 h-4 text-emerald-600" />}
                      {notFlyingOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {notFlyingOpen && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                      {/* If already filled out on Flights tab, show autofill button */}
                      {notFlyingData && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <p className="text-xs text-emerald-700 font-inter font-semibold mb-1">
                            ✓ Autofilled from Flights tab
                          </p>
                          <p className="text-sm font-inter font-bold text-emerald-800">{notFlyingData.label}</p>
                          <p className="text-xs text-emerald-700 font-inter">
                           Total: ${notFlyingData.totalCost.toLocaleString()}
                           {numT > 1 && ` · $${Math.round(notFlyingData.totalCost / numT).toLocaleString()}/person`}
                           {notFlyingData.details?.hours && ` · ${notFlyingData.details.hours}h drive`}
                          </p>
                          {notFlyingData.details?.routeNote && (
                            <p className="text-xs text-emerald-600 font-inter mt-1 italic">{notFlyingData.details.routeNote}</p>
                          )}
                          {notFlyingData.notes && (
                            <p className="text-xs text-emerald-600 font-inter mt-1">📝 {notFlyingData.notes}</p>
                          )}
                          <button
                            onClick={() => {
                              onFlightSelect({ _notFlying: true, ...notFlyingData });
                              setFlightOpen(false);
                              setNotFlyingOpen(false);
                            }}
                            className="mt-2 w-full py-2 rounded-lg bg-emerald-600 text-white font-inter font-semibold text-xs hover:bg-emerald-700 transition-colors"
                          >
                            ✓ Use This as My Transport
                          </button>
                        </div>
                      )}

                      {/* If not filled out, show inline AlternativeTransport */}
                      {!notFlyingData && (
                        <div className="text-xs text-muted-foreground font-inter">
                          <p className="mb-3">Fill out your transport details on the <span className="font-semibold text-primary">Flights tab</span> "Not flying?" section — it will autofill here. Or estimate below:</p>
                          <AlternativeTransport
                            preferences={preferences}
                            trip={trip}
                            departure={departureDate}
                            onTransportSelect={(data) => {
                              onNotFlyingSelect?.(data);
                              onFlightSelect({ _notFlying: true, ...data });
                              setFlightOpen(false);
                              setNotFlyingOpen(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom flight input */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-xl text-xs mt-2"
                  onClick={() => setCustomFlightOpen(!customFlightOpen)}
                >
                  <Plus className="w-3 h-3 mr-1.5" /> Add Custom Flight
                </Button>
                {customFlightOpen && (
                  <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
                    <Input
                      placeholder="Flight details (e.g., United 456)"
                      value={customFlightData.airline}
                      onChange={(e) => setCustomFlightData({ ...customFlightData, airline: e.target.value })}
                      className="text-xs rounded-lg"
                    />
                    <Input
                      type="number"
                      placeholder="Price per person ($)"
                      value={customFlightData.price}
                      onChange={(e) => setCustomFlightData({ ...customFlightData, price: e.target.value })}
                      className="text-xs rounded-lg"
                    />
                    <Button
                      size="sm"
                      className="w-full rounded-lg text-xs"
                      disabled={!customFlightData.airline || !customFlightData.price}
                      onClick={() => {
                        onFlightSelect({
                          airline: customFlightData.airline,
                          estimated_price_per_person: parseInt(customFlightData.price),
                          _custom: true
                        });
                        setCustomFlightData({ airline: '', price: '' });
                        setCustomFlightOpen(false);
                        setFlightOpen(false);
                      }}
                    >
                      Add Flight
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Accommodation row */}
        {accommodations?.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors"
              onClick={() => setAccomOpen(o => !o)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Bed className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground font-inter">Selected Stay</p>
                  <p className="text-sm font-semibold font-inter">{activeAccom?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground font-inter">
                    {activeAccom ? `$${(activeAccom.price_per_night || 0).toLocaleString()}/night · ${nights} nights` : ''}
                    {!selectedAccom && activeAccom && <span className="ml-1 text-emerald-600 font-medium">(lowest price)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-inter">${accomTotal.toLocaleString()}</span>
                {accomOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {accomOpen && (
              <div className="px-5 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground font-inter mb-2">Select an accommodation:</p>
                {accommodations.map((a, i) => {
                  const total = a.price_for_full_trip || (a.price_per_night || 0) * nights;
                  const isActive = activeAccom?.name === a.name;
                  return (
                    <button
                      key={i}
                      onClick={() => { onAccomSelect(a); setAccomOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors text-left ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-secondary/40'}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold font-inter">{a.name}</p>
                          {a.tier_label && <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-inter">{a.tier_label}</span>}
                          {!selectedAccom && isActive && <span className="text-xs text-emerald-600 font-inter">(default)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground font-inter">
                          {a.neighborhood && `${a.neighborhood} · `}${(a.price_per_night || 0).toLocaleString()}/night
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold font-inter">${total.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground font-inter">{nights} nights</p>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </button>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-xl text-xs mt-2"
                  onClick={() => setCustomAccomOpen(!customAccomOpen)}
                >
                  <Plus className="w-3 h-3 mr-1.5" /> Add Custom Stay
                </Button>
                {customAccomOpen && (
                  <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
                    <Input
                      placeholder="Hotel/accommodation name"
                      value={customAccomData.name}
                      onChange={(e) => setCustomAccomData({ ...customAccomData, name: e.target.value })}
                      className="text-xs rounded-lg"
                    />
                    <Input
                      type="number"
                      placeholder="Price per night ($)"
                      value={customAccomData.price}
                      onChange={(e) => setCustomAccomData({ ...customAccomData, price: e.target.value })}
                      className="text-xs rounded-lg"
                    />
                    <Button
                      size="sm"
                      className="w-full rounded-lg text-xs"
                      disabled={!customAccomData.name || !customAccomData.price}
                      onClick={() => {
                        onAccomSelect({
                          name: customAccomData.name,
                          price_per_night: parseInt(customAccomData.price),
                          price_for_full_trip: parseInt(customAccomData.price) * nights,
                          _custom: true
                        });
                        setCustomAccomData({ name: '', price: '' });
                        setCustomAccomOpen(false);
                        setAccomOpen(false);
                      }}
                    >
                      Add Stay
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Total fixed costs row */}
        {(activeFlight || activeAccom || isNotFlying) && (
          <div className="px-5 py-3.5 bg-secondary/20 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground font-inter uppercase tracking-wide">
              {isNotFlying ? 'Transport + Stay (fixed costs)' : 'Flights + Stay (fixed costs)'}
            </p>
            <p className="text-sm font-bold font-inter text-foreground">${(transportCostForTotal + accomTotal).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}