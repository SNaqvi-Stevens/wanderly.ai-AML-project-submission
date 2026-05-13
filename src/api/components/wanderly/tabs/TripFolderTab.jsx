import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MapPin, Plane, Hotel, Calendar, DollarSign, ExternalLink, CheckCircle2, Pencil, Plus, Trash2, X, Check, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TripDocumentFolder from "@/components/wanderly/TripDocumentFolder";
import BudgetTracker from "@/components/wanderly/BudgetTracker";
import { googleMapsUrl, bookingDotComUrl } from "@/lib/bookingLinks";
import { generateTripPDF } from "@/lib/generateTripPDF";

const BOOKING_ITEMS = [
  { key: "flights_booked", label: "Flights", confKey: "flights" },
  { key: "hotel_booked", label: "Hotel / Accommodation", confKey: "hotel" },
  { key: "travel_insurance_booked", label: "Travel Insurance", confKey: "travel_insurance" },
  { key: "tours_booked", label: "Tours & Activities", confKey: "tours" },
  { key: "visa_confirmed", label: "Visa / Entry Requirements", confKey: "visa" },
  { key: "airport_transfer_booked", label: "Airport Transfer", confKey: "airport_transfer" },
];

export default function TripFolderTab({ trip, content, transportContent, accommodationContent, packingContent, budgetContent, preferences, destination }) {
  const [localTrip, setLocalTrip] = useState(trip);
  const [itinerary, setItinerary] = useState(content?.itinerary || []);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editingDayIdx, setEditingDayIdx] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [accommodations, setAccommodations] = useState(accommodationContent?.accommodations || []);
  const [editingAccomIdx, setEditingAccomIdx] = useState(null);
  const [editingAccom, setEditingAccom] = useState(null);
  const transport = transportContent?.transport || {};
  const destName = trip?.destination_name || destination?.name || '';
  const days = trip?.trip_length_days || 5;

  const bookingStatus = localTrip?.booking_status || {};
  const confirmations = localTrip?.booking_confirmations || {};

  const startEditDay = (i) => { setEditingDayIdx(i); setEditingDay({ ...itinerary[i] }); };
  const saveDay = () => {
    const updated = itinerary.map((d, i) => i === editingDayIdx ? editingDay : d);
    setItinerary(updated);
    setEditingDayIdx(null);
    setEditingDay(null);
  };

  const startEditAccom = (i) => { setEditingAccomIdx(i); setEditingAccom({ ...accommodations[i] }); };
  const saveAccom = () => {
    const updated = accommodations.map((a, i) => i === editingAccomIdx ? editingAccom : a);
    setAccommodations(updated);
    setEditingAccomIdx(null);
    setEditingAccom(null);
  };
  const confirmedCount = BOOKING_ITEMS.filter(i => bookingStatus[i.key]).length;

  const updateBookingStatus = async (key, value) => {
    const updated = { ...bookingStatus, [key]: value };
    setLocalTrip(prev => ({ ...prev, booking_status: updated }));
    if (localTrip?.id) await base44.entities.Trip.update(localTrip.id, { booking_status: updated });
  };

  const updateConfirmation = async (key, value) => {
    const updated = { ...confirmations, [key]: value };
    setLocalTrip(prev => ({ ...prev, booking_confirmations: updated }));
    if (localTrip?.id) await base44.entities.Trip.update(localTrip.id, { booking_confirmations: updated });
  };

  return (
    <div className="space-y-6">
      {/* Section 1 — Trip Summary */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-playfair text-2xl font-bold">{destName}</h3>
            <p className="text-muted-foreground font-inter">{trip?.country}</p>
          </div>
          <Badge className={`rounded-xl text-xs font-inter ${confirmedCount === BOOKING_ITEMS.length ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
            {confirmedCount} of {BOOKING_ITEMS.length} confirmed
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-secondary/50 rounded-xl p-3">
            <div className="text-xs text-muted-foreground font-inter">Duration</div>
            <div className="font-inter font-semibold">{days} days</div>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <div className="text-xs text-muted-foreground font-inter">Budget</div>
            <div className="font-inter font-semibold">${(trip?.user_budget_cap || trip?.total_cost_budget || 0).toLocaleString()}</div>
          </div>
          {trip?.recommended_dates?.start && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground font-inter">Dates</div>
              <div className="font-inter font-semibold text-sm">{trip.recommended_dates.start}</div>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs font-inter text-muted-foreground mb-1">
            <span>Booking progress</span>
            <span>{Math.round((confirmedCount / BOOKING_ITEMS.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(confirmedCount / BOOKING_ITEMS.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Section 1b — Budget Tracker */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <BudgetTracker trip={localTrip} onTripUpdate={setLocalTrip} />
      </div>

      {/* Section 2 — Itinerary Snapshot (editable) */}
      {itinerary.length > 0 && (
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-4">📅 Itinerary Snapshot</h3>
          <div className="space-y-3">
            {itinerary.map((day, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-4">
                {editingDayIdx === i ? (
                  <div className="space-y-2">
                    <Input value={editingDay.thematic_title || ''} onChange={e => setEditingDay({ ...editingDay, thematic_title: e.target.value })} placeholder="Day title" className="h-8 text-sm rounded-lg" />
                    <Input value={editingDay.morning?.activity || ''} onChange={e => setEditingDay({ ...editingDay, morning: { ...editingDay.morning, activity: e.target.value } })} placeholder="Morning activity" className="h-8 text-sm rounded-lg" />
                    <Input value={editingDay.afternoon?.activity || ''} onChange={e => setEditingDay({ ...editingDay, afternoon: { ...editingDay.afternoon, activity: e.target.value } })} placeholder="Afternoon activity" className="h-8 text-sm rounded-lg" />
                    <Input value={editingDay.evening?.dinner_spot || ''} onChange={e => setEditingDay({ ...editingDay, evening: { ...editingDay.evening, dinner_spot: e.target.value } })} placeholder="Dinner spot" className="h-8 text-sm rounded-lg" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDay} className="rounded-lg h-7 text-xs gap-1"><Check className="w-3 h-3" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingDayIdx(null)} className="rounded-lg h-7 text-xs"><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-inter font-semibold text-sm">Day {day.day_number} · {day.thematic_title}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {[day.morning?.activity, day.afternoon?.activity, day.evening?.dinner_spot].filter(Boolean).map((act, j) => (
                          <a key={j} href={googleMapsUrl(`${act} ${destName}`)} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary font-inter hover:underline flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />{act}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 mt-0.5">
                      <button onClick={() => startEditDay(i)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setItinerary(itinerary.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3 — Transport */}
      {(transport.daily_transport_recommendation || transport.airport_transfer_options?.length > 0) && (
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-4">🚌 Transport Details</h3>
          {transport.airport_transfer_options?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground font-inter uppercase tracking-wider mb-2">Airport Transfer</p>
              {transport.airport_transfer_options.slice(0, 2).map((opt, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm font-inter">{opt.method}</span>
                  <span className="text-sm font-inter font-semibold text-primary">${opt.estimated_cost_usd}</span>
                </div>
              ))}
            </div>
          )}
          {transport.daily_transport_recommendation && (
            <p className="text-sm text-muted-foreground font-inter">{transport.daily_transport_recommendation}</p>
          )}
        </div>
      )}

      {/* Section 4 — Where You're Staying (editable) */}
      {accommodations.length > 0 && (
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-4">🏨 Where You're Staying</h3>
          <div className="space-y-3">
            {accommodations.slice(0, 3).map((a, i) => (
              <div key={i} className="border-b border-border/50 last:border-0 pb-3">
                {editingAccomIdx === i ? (
                  <div className="space-y-2">
                    <Input value={editingAccom.name || ''} onChange={e => setEditingAccom({ ...editingAccom, name: e.target.value })} placeholder="Hotel name" className="h-8 text-sm rounded-lg" />
                    <Input value={editingAccom.neighborhood || ''} onChange={e => setEditingAccom({ ...editingAccom, neighborhood: e.target.value })} placeholder="Neighborhood" className="h-8 text-sm rounded-lg" />
                    <Input type="number" value={editingAccom.price_per_night || ''} onChange={e => setEditingAccom({ ...editingAccom, price_per_night: parseFloat(e.target.value) })} placeholder="Price per night" className="h-8 text-sm rounded-lg" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveAccom} className="rounded-lg h-7 text-xs gap-1"><Check className="w-3 h-3" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingAccomIdx(null)} className="rounded-lg h-7 text-xs"><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-inter font-semibold text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground font-inter">{a.type?.replace(/_/g, ' ')} · {a.neighborhood}</p>
                    </div>
                    <div className="text-right flex items-start gap-2">
                      <div>
                        <p className="font-inter font-bold text-primary">${a.price_per_night}/night</p>
                        <a href={bookingDotComUrl(destName)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-inter hover:underline flex items-center gap-0.5 justify-end">
                          <ExternalLink className="w-2.5 h-2.5" />Book
                        </a>
                      </div>
                      <button onClick={() => startEditAccom(i)} className="text-muted-foreground hover:text-foreground mt-0.5">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setAccommodations(accommodations.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5 — Booking Checklist */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-4">✅ Booking Checklist</h3>
        <div className="space-y-4">
          {BOOKING_ITEMS.map(item => (
            <div key={item.key} className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={bookingStatus[item.key] || false}
                  onCheckedChange={v => updateBookingStatus(item.key, !!v)}
                  id={item.key}
                />
                <label htmlFor={item.key} className="font-inter text-sm font-medium cursor-pointer flex-1">{item.label}</label>
                {bookingStatus[item.key] && confirmations[item.confKey] && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-0 rounded-lg text-xs">✅ #{confirmations[item.confKey]}</Badge>
                )}
              </div>
              {bookingStatus[item.key] && (
                <Input
                  placeholder="Confirmation # (optional)"
                  value={confirmations[item.confKey] || ''}
                  onChange={e => updateConfirmation(item.confKey, e.target.value)}
                  className="h-8 text-xs rounded-lg ml-7"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 6 — Documents */}
      <div className="bg-card rounded-2xl p-6 shadow-sm" data-docs>
        <TripDocumentFolder trip={localTrip} onTripUpdate={setLocalTrip} />
      </div>

      {/* Section 7 — Download PDF */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-2">📄 Download Trip Plan</h3>
        <p className="text-sm text-muted-foreground font-inter mb-4">Compile your full itinerary, budget breakdown, and packing list into a clean, printable PDF.</p>
        <div className="flex gap-3 flex-wrap">
          <Button
            className="rounded-xl"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                await generateTripPDF({
                  trip: localTrip,
                  itinerary,
                  budgetContent,
                  packingContent,
                  preferences,
                });
              } finally {
                setPdfLoading(false);
              }
            }}
          >
            {pdfLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
            🖨️ Print Page
          </Button>
        </div>
      </div>
    </div>
  );
}