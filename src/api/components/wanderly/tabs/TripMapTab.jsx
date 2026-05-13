import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Loader2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORY_CONFIG = {
  accommodation: { color: "#0ea5e9", label: "Stay",     icon: "🏨" },
  restaurant:    { color: "#f97316", label: "Food",     icon: "🍽️" },
  excursion:     { color: "#6366f1", label: "Activity", icon: "🧭" },
  itinerary:     { color: "#10b981", label: "Itinerary",icon: "📅" },
  transport:     { color: "#8b5cf6", label: "Transport",icon: "✈️" },
  money:         { color: "#eab308", label: "Money",    icon: "💱" },
};

function createPin(color, emoji) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};width:36px;height:36px;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:15px;line-height:1;">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function createActivePin(color, emoji) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};width:44px;height:44px;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:18px;line-height:1;">${emoji}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
}

function FlyTo({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], 15, { duration: 0.8 });
  }, [point, map]);
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
      fitted.current = true;
    }
  }, [points, map]);
  return null;
}

const geocodeCache = new Map();

async function geocode(query, country) {
  const key = `${query}||${country}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  try {
    // query already includes destination name (e.g. "Eiffel Tower, Paris")
    const q = encodeURIComponent(country ? `${query}, ${country}` : query);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "Accept-Language": "en" }
    });
    const data = await res.json();
    if (data[0]) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(key, result);
      return result;
    }
  } catch {}
  geocodeCache.set(key, null);
  return null;
}

// Debug helper — logs tabContent keys and place counts to console
function debugTabContent(tabContent, places) {
  console.log("[TripMapTab] tabContent keys:", Object.keys(tabContent || {}));
  console.log("[TripMapTab] tabContent sample:", JSON.stringify(tabContent).slice(0, 500));
  console.log("[TripMapTab] placesToGeocode count:", places.length, places.slice(0, 3));
}

export default function TripMapTab({ trip, tabContent }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const markerRefs = useRef({});

  const destName = trip?.destination_name || "";
  const destCountry = trip?.country || "";

  const placesToGeocode = useMemo(() => {
    const places = [];

    // Accommodations — handle both {accommodations:[]} and top-level array
    const accoms = tabContent?.accommodations?.accommodations || tabContent?.accommodations || [];
    accoms.forEach(a => {
      if (a?.name) places.push({
        name: `${a.name}, ${destName}`,
        displayName: a.name,
        category: "accommodation",
        subtitle: a.neighborhood,
        note: a.type?.replace(/_/g, " "),
        price: a.price_per_night ? `$${a.price_per_night}/night` : null
      });
    });

    // Restaurants — handle both {restaurants:[]} and top-level array
    const rests = tabContent?.restaurants?.restaurants || tabContent?.restaurants || [];
    rests.forEach(r => {
      if (r?.name) places.push({
        name: `${r.name}, ${destName}`,
        displayName: r.name,
        category: "restaurant",
        subtitle: r.cuisine,
        note: r.must_try_dish,
        price: r.price_per_person ? `~$${r.price_per_person}/person` : null
      });
    });

    // Excursions — handle both {excursions:[]} and top-level array
    const excurs = tabContent?.excursions?.excursions || tabContent?.excursions || [];
    excurs.forEach(e => {
      if (e?.name) places.push({
        name: `${e.name}, ${destName}`,
        displayName: e.name,
        category: "excursion",
        subtitle: e.category?.replace(/_/g, " "),
        note: e.description?.slice(0, 80),
        price: e.price_per_person === 0 ? "Free" : e.price_per_person ? `$${e.price_per_person}/person` : null
      });
    });

    // Itinerary activities
    const itin = tabContent?.itinerary?.itinerary || tabContent?.itinerary || [];
    itin.forEach(day => {
      const dayLabel = day.thematic_title || `Day ${day.day_number}`;
      if (day.morning?.activity) places.push({ name: `${day.morning.activity}, ${destName}`, displayName: day.morning.activity, category: "itinerary", subtitle: `${dayLabel} – Morning`, note: day.morning.description?.slice(0, 80) });
      if (day.afternoon?.activity) places.push({ name: `${day.afternoon.activity}, ${destName}`, displayName: day.afternoon.activity, category: "itinerary", subtitle: `${dayLabel} – Afternoon`, note: day.afternoon.description?.slice(0, 80) });
      if (day.evening?.dinner_spot) places.push({ name: `${day.evening.dinner_spot}, ${destName}`, displayName: day.evening.dinner_spot, category: "restaurant", subtitle: `${dayLabel} – Dinner`, note: day.evening.cuisine });
      if (day.evening?.evening_activity) places.push({ name: `${day.evening.evening_activity}, ${destName}`, displayName: day.evening.evening_activity, category: "itinerary", subtitle: `${dayLabel} – Evening`, note: day.evening.description?.slice(0, 80) });
    });

    // Airport transfers / transport
    const transport = tabContent?.transport?.transport || tabContent?.transport || {};
    (transport.airport_transfer_options || []).forEach(t => {
      if (t?.method) places.push({
        name: `${destName} airport`,
        displayName: `${destName} Airport`,
        category: "transport",
        subtitle: t.method,
        note: t.description,
        price: t.estimated_cost_usd ? `~$${t.estimated_cost_usd}` : null
      });
    });

    // Money exchange locations
    const money = tabContent?.money?.money || tabContent?.money || {};
    (money.exchange_options || []).filter(o => !o.avoid).slice(0, 3).forEach(o => {
      if (o?.method) places.push({
        name: `currency exchange ${destName}`,
        displayName: `Currency Exchange`,
        category: "money",
        subtitle: o.method,
        note: o.description,
        price: o.fee_estimate || null
      });
    });

    const seen = new Set();
    return places.filter(p => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }, [tabContent, destName]);

  useEffect(() => {
    debugTabContent(tabContent, placesToGeocode);
    if (placesToGeocode.length === 0) { setLoading(false); return; }
    setLoading(true);
    setPoints([]);
    let cancelled = false;

    const run = async () => {
      // Check cache first — show cached results immediately
      const cached = [];
      const uncached = [];
      for (const p of placesToGeocode) {
        const key = `${p.name}||${destCountry}`;
        if (geocodeCache.has(key)) {
          const coords = geocodeCache.get(key);
          if (coords) cached.push({ ...p, ...coords });
        } else {
          uncached.push(p);
        }
      }
      if (cached.length > 0) setPoints([...cached]);

      // Geocode all uncached in parallel — use p.name which already includes destination context
      const batchResults = await Promise.all(
        uncached.map(p => geocode(p.name, destCountry).then(coords =>
          coords ? { ...p, ...coords } : null
        ))
      );
      if (!cancelled) {
        setPoints(prev => {
          const next = [...prev];
          batchResults.forEach(r => { if (r) next.push(r); });
          return next;
        });
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [placesToGeocode, destName, destCountry]);

  const filteredPoints = useMemo(() =>
    activeFilter === "all" ? points : points.filter(p => p.category === activeFilter),
    [points, activeFilter]
  );

  const categoryCounts = useMemo(() => {
    const counts = {};
    points.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [points]);

  const center = points.length > 0 ? [points[0].lat, points[0].lng] : [20, 0];

  const handleSelectPoint = (point) => {
    setSelectedPoint(point);
    const ref = markerRefs.current[point.name];
    if (ref) ref.openPopup();
  };

  if (placesToGeocode.length === 0 && !loading) {
    return (
      <div className="bg-card rounded-2xl p-10 shadow-sm text-center">
        <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-xl font-semibold mb-2">Map</h3>
        <p className="text-sm text-muted-foreground font-inter">Trip data is still generating. Check the itinerary, restaurants, and activities tabs first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-0 rounded-2xl overflow-hidden border shadow-sm" style={{ height: "680px" }}>

      {/* Sidebar */}
      <div className="w-full md:w-72 flex-shrink-0 bg-card flex flex-col border-r" style={{ height: "680px" }}>
        {/* Filter chips */}
        <div className="p-3 border-b flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-inter font-medium transition-colors ${activeFilter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
          >
            All ({points.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) =>
            categoryCounts[cat] > 0 && (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className="px-3 py-1 rounded-full text-xs font-inter font-medium transition-all border-2"
                style={{
                  borderColor: cfg.color,
                  backgroundColor: activeFilter === cat ? cfg.color : "transparent",
                  color: activeFilter === cat ? "white" : cfg.color,
                }}
              >
                {cfg.label} ({categoryCounts[cat]})
              </button>
            )
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredPoints.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm font-inter gap-2">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span>Locating places…</span></> : <span>No places found</span>}
            </div>
          )}
          {filteredPoints.map((p, i) => {
            const cfg = CATEGORY_CONFIG[p.category];
            const isActive = selectedPoint?.name === p.name;
            return (
              <button
                key={`${p.name}-${i}`}
                onClick={() => handleSelectPoint(p)}
                className={`w-full text-left px-4 py-3 border-b transition-colors flex items-start gap-3 ${isActive ? "bg-secondary" : "hover:bg-muted/50"}`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: cfg.color + "20" }}>
                  <span className="text-sm">{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-inter font-semibold text-sm truncate text-foreground">{p.displayName || p.name}</div>
                  {p.subtitle && <div className="text-xs text-muted-foreground font-inter capitalize truncate mt-0.5">{p.subtitle}</div>}
                  {p.price && <div className="text-xs font-inter font-medium mt-0.5" style={{ color: cfg.color }}>{p.price}</div>}
                </div>
              </button>
            );
          })}

          {loading && filteredPoints.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground font-inter">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding more places…
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1" style={{ height: "680px" }}>
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true} zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />
          {filteredPoints.length > 1 && <FitBounds points={filteredPoints} />}
          {selectedPoint && <FlyTo point={selectedPoint} />}
          {filteredPoints.map((p, i) => {
            const cfg = CATEGORY_CONFIG[p.category];
            const isActive = selectedPoint?.name === p.name;
            return (
              <Marker
                key={`${p.name}-${i}`}
                position={[p.lat, p.lng]}
                icon={isActive ? createActivePin(cfg.color, cfg.icon) : createPin(cfg.color, cfg.icon)}
                ref={ref => { if (ref) markerRefs.current[p.name] = ref; }}
                eventHandlers={{ click: () => setSelectedPoint(p) }}
              >
                <Popup>
                  <div style={{ minWidth: 160, fontFamily: "sans-serif" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                      <strong style={{ fontSize: 13 }}>{p.displayName || p.name}</strong>
                    </div>
                    {p.subtitle && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2, textTransform: "capitalize" }}>{p.subtitle}</div>}
                    {p.note && <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>{p.note}</div>}
                    {p.price && <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{p.price}</span>}
                    <div style={{ marginTop: 6 }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, backgroundColor: cfg.color, color: "white", fontSize: 10 }}>{cfg.label}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}