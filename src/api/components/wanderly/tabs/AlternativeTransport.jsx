import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

// ── ALTERNATIVE TRANSPORT COMPONENT ──────────────────────────────────────────
// onTransportSelect(data) — called when user confirms a transport option
// data = { type: 'drive'|'other', label, totalCost, details }
export default function AlternativeTransport({ preferences, trip, departure, onTransportSelect }) {
  const [open, setOpen]             = React.useState(false);
  const [mode, setMode]             = React.useState(null); // null | 'drive' | 'other'

  // Drive state
  const [originAddress, setOrigin]  = React.useState('');
  const [destAddress, setDestAddr]  = React.useState('');
  const [driveResult, setDriveResult] = React.useState(null);
  const [loading, setLoading]       = React.useState(false);
  const [rentCar, setRentCar]       = React.useState(false);
  const [rentPerDay, setRentPerDay] = React.useState(45);

  // Other transport state
  const [otherMode, setOtherMode]   = React.useState('');
  const [otherCost, setOtherCost]   = React.useState('');
  const [otherNotes, setOtherNotes] = React.useState('');

  const numTravelers = preferences?.num_travelers || 1;
  const tripDays     = trip?.trip_length_days || 7;

  // Seasonal gas price (US average)
  const getGasPrice = (dateStr) => {
    const month = parseInt((dateStr || '').split('-')[1], 10) || (new Date().getMonth() + 1);
    const prices = {1:3.20,2:3.25,3:3.45,4:3.60,5:3.75,6:3.85,
                    7:3.80,8:3.75,9:3.55,10:3.40,11:3.30,12:3.20};
    return prices[month] || 3.50;
  };

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun',
                       'Jul','Aug','Sep','Oct','Nov','Dec'];

  const estimateDrive = async () => {
    if (!originAddress || !destAddress) return;
    setLoading(true);
    setDriveResult(null);
    try {
      const parsed = await base44.integrations.Core.InvokeLLM({
        prompt: `Estimate the driving distance and time from "${originAddress}" to "${destAddress}". Accept any format: city names, city+state, city+country, full addresses, abbreviations like "TX" or "MX". Use your knowledge of geography to provide a realistic estimate for the most common driving route between these two locations. Return ONLY a JSON object with no extra text:
{"miles":<number>,"hours":<number with 1 decimal>,"route_note":"<one short sentence about the main highway or route used>","mpg":28}`,
        response_json_schema: {
          type: "object",
          properties: {
            miles: { type: "number" },
            hours: { type: "number" },
            route_note: { type: "string" },
            mpg: { type: "number" }
          }
        }
      });

      if (parsed?.miles) {
        const gasPrice  = getGasPrice(departure);
        const gallons   = parsed.miles / (parsed.mpg || 28);
        const gasCost   = Math.round(gallons * gasPrice);
        const rentCost  = rentCar ? rentPerDay * tripDays : 0;
        const totalCost = gasCost + rentCost;
        const monthName = MONTH_NAMES[(parseInt((departure||'').split('-')[1],10)||1)-1];
        const needsHotel = parsed.hours >= 20;
        const hotelNights = needsHotel ? Math.floor((parsed.hours - 10) / 10) : 0;

        setDriveResult({
          miles:      Math.round(parsed.miles),
          hours:      parsed.hours,
          routeNote:  parsed.route_note,
          gasPrice,
          gallons:    Math.round(gallons * 10) / 10,
          gasCost,
          rentCost,
          totalCost,
          monthName,
          needsHotel,
          hotelNights,
        });
      } else {
        setDriveResult({ error: true });
      }
    } catch {
      setDriveResult({ error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      {/* Collapsed trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🚗</span>
          <div className="text-left">
            <p className="font-inter font-semibold text-sm">Not flying?</p>
            <p className="text-xs text-muted-foreground font-inter">
              Estimate driving cost or add another form of transport
            </p>
          </div>
        </div>
        <span className="text-muted-foreground text-lg">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-border pt-5 space-y-5">

          {/* Mode selector */}
          <div className="flex gap-3">
            {[
              { id: 'drive', icon: '🚗', label: 'Drive' },
              { id: 'other', icon: '🚌', label: 'Other transport' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setMode(mode === opt.id ? null : opt.id)}
                className={`flex-1 py-3 rounded-xl border-2 font-inter font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  mode === opt.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-secondary/30 hover:border-primary/40 text-foreground'
                }`}
              >
                <span>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>

          {/* ── DRIVE MODE ── */}
          {mode === 'drive' && (
            <div className="space-y-4">

              {/* Address inputs */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground font-inter uppercase tracking-wide block mb-1.5">
                    Starting city or address
                  </label>
                  <input
                    type="text"
                    value={originAddress}
                    onChange={e => setOrigin(e.target.value)}
                    placeholder="e.g. Houston, TX or your address"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground font-inter uppercase tracking-wide block mb-1.5">
                    Destination city or address
                  </label>
                  <input
                    type="text"
                    value={destAddress}
                    onChange={e => setDestAddr(e.target.value)}
                    placeholder={trip?.destination_name || 'e.g. Mexico City, Mexico'}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Rental car */}
              <div className="bg-secondary/40 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-1">
                  <button
                    onClick={() => setRentCar(r => !r)}
                    className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${rentCar ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rentCar ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm font-semibold font-inter">Renting a car?</span>
                </div>
                {rentCar && (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-muted-foreground font-inter flex-shrink-0">Cost per day ($)</label>
                    <input
                      type="number"
                      value={rentPerDay}
                      onChange={e => setRentPerDay(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-24 px-3 py-2 rounded-lg border border-border bg-background font-inter text-sm text-center"
                    />
                    <span className="text-xs text-muted-foreground font-inter">
                      × {tripDays} days = <strong className="text-foreground">${(rentPerDay * tripDays).toLocaleString()}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Estimate button */}
              <button
                onClick={estimateDrive}
                disabled={loading || !originAddress.trim() || !destAddress.trim()}
                className="w-full py-3 rounded-xl bg-primary text-white font-inter font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                {loading
                  ? <><span className="animate-spin inline-block">⏳</span> Estimating route…</>
                  : '🗺️ Estimate Drive Cost'}
              </button>

              {/* Error */}
              {driveResult?.error && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 font-inter">
                  ⚠️ Could not estimate this route. Try a more specific address (include city and state).
                </div>
              )}

              {/* Results */}
              {driveResult && !driveResult.error && (
                <div className="space-y-3">

                  {/* Main stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: '📍', label: 'Distance',    val: `${driveResult.miles.toLocaleString()} mi` },
                      { icon: '⏱️', label: 'Drive time',  val: `${driveResult.hours}h` },
                      { icon: '⛽', label: `Gas (${driveResult.monthName})`, val: `$${driveResult.gasCost.toLocaleString()}` },
                      { icon: '🚙', label: rentCar ? 'Car rental' : 'No rental',
                        val: rentCar ? `$${driveResult.rentCost.toLocaleString()}` : '—' },
                    ].map(({ icon, label, val }) => (
                      <div key={label} className="bg-secondary/50 rounded-xl p-3 text-center">
                        <div className="text-lg mb-0.5">{icon}</div>
                        <div className="text-xs text-muted-foreground font-inter">{label}</div>
                        <div className="text-base font-bold font-inter text-foreground mt-0.5">{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-inter font-bold">Total driving cost</p>
                      {numTravelers > 1 && (
                        <p className="text-xs text-muted-foreground font-inter mt-0.5">
                          ${Math.round(driveResult.totalCost / numTravelers).toLocaleString()} per person ({numTravelers} travelers)
                        </p>
                      )}
                    </div>
                    <span className="text-2xl font-bold font-inter text-primary">
                      ${driveResult.totalCost.toLocaleString()}
                    </span>
                  </div>

                  {/* Gas detail */}
                  <p className="text-xs text-muted-foreground font-inter">
                    ⛽ ${driveResult.gasPrice.toFixed(2)}/gal seasonal avg for {driveResult.monthName} · {driveResult.gallons} gallons · 28 MPG assumed
                    {driveResult.routeNote && ` · ${driveResult.routeNote}`}
                  </p>

                  {/* Select as transport */}
                  {onTransportSelect && (
                    <button
                      onClick={() => {
                        onTransportSelect({
                          type: 'drive',
                          label: `Drive (${driveResult.miles.toLocaleString()} mi)`,
                          totalCost: driveResult.totalCost,
                          details: driveResult,
                          rentCar,
                        });
                        setOpen(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-primary text-white font-inter font-semibold text-sm hover:bg-primary/90 transition-colors"
                    >
                      ✓ Use This as My Transport
                    </button>
                  )}

                  {/* 20+ hour hotel warning */}
                  {driveResult.needsHotel && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="font-inter font-semibold text-amber-800 flex items-center gap-2 mb-1">
                        🏨 Budget for overnight stops
                      </p>
                      <p className="text-sm text-amber-700 font-inter">
                        At {driveResult.hours}h, this is a long drive — plan for roughly {driveResult.hotelNights} overnight stop{driveResult.hotelNights > 1 ? 's' : ''} along the way.
                        Budget an extra <strong>${(driveResult.hotelNights * 80 * Math.ceil(numTravelers / 2)).toLocaleString()}–${(driveResult.hotelNights * 120 * Math.ceil(numTravelers / 2)).toLocaleString()}</strong> for roadside hotels
                        ({driveResult.hotelNights} night{driveResult.hotelNights > 1 ? 's' : ''} · {Math.ceil(numTravelers / 2)} room{Math.ceil(numTravelers / 2) > 1 ? 's' : ''} · $80–$120/room).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── OTHER TRANSPORT MODE ── */}
          {mode === 'other' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground font-inter uppercase tracking-wide block mb-1.5">
                    Form of transport
                  </label>
                  <input
                    type="text"
                    value={otherMode}
                    onChange={e => setOtherMode(e.target.value)}
                    placeholder="e.g. Bus, Train, Ferry…"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {/* Quick-select chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Bus', 'Train', 'Ferry', 'Amtrak', 'Rideshare'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setOtherMode(opt)}
                        className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border hover:border-primary hover:text-primary font-inter transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground font-inter uppercase tracking-wide block mb-1.5">
                    Total cost ($)
                  </label>
                  <input
                    type="number"
                    value={otherCost}
                    onChange={e => setOtherCost(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background font-inter text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground font-inter uppercase tracking-wide block mb-1.5">
                    Extra notes
                  </label>
                  <input
                    type="text"
                    value={otherNotes}
                    onChange={e => setOtherNotes(e.target.value)}
                    placeholder="e.g. 8h overnight, book 2 wks ahead"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {otherMode && otherCost && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                  <p className="font-inter font-bold">{otherMode} — Cost Summary</p>
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-white rounded-xl px-5 py-3 text-center shadow-sm">
                      <div className="text-xs text-muted-foreground font-inter">Total</div>
                      <div className="text-2xl font-bold font-inter text-primary">
                        ${parseInt(otherCost || 0).toLocaleString()}
                      </div>
                    </div>
                    {numTravelers > 1 && (
                      <div className="bg-white rounded-xl px-5 py-3 text-center shadow-sm">
                        <div className="text-xs text-muted-foreground font-inter">Per person</div>
                        <div className="text-2xl font-bold font-inter text-primary">
                          ${Math.round(parseInt(otherCost || 0) / numTravelers).toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-xl px-5 py-3 text-center shadow-sm">
                      <div className="text-xs text-muted-foreground font-inter">vs estimated flight</div>
                      {(() => {
                        const flightEst = (trip?.budget_breakdown?.flight_per_person || 300) * numTravelers;
                        const diff      = parseInt(otherCost || 0) - flightEst;
                        return (
                          <div className={`text-lg font-bold font-inter ${diff < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {diff < 0
                              ? `Saves $${Math.abs(diff).toLocaleString()}`
                              : `$${diff.toLocaleString()} more`}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {otherNotes && (
                    <p className="text-xs text-muted-foreground font-inter">📝 {otherNotes}</p>
                  )}
                  {onTransportSelect && (
                    <button
                      onClick={() => {
                        onTransportSelect({
                          type: 'other',
                          label: otherMode,
                          totalCost: parseInt(otherCost || 0),
                          notes: otherNotes,
                        });
                        setOpen(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-primary text-white font-inter font-semibold text-sm hover:bg-primary/90 transition-colors"
                    >
                      ✓ Use This as My Transport
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}