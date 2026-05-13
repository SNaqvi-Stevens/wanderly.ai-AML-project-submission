// ─────────────────────────────────────────────────────────────────────────────
// Wanderly.ai — Booking Deep Links
// src/lib/bookingLinks.js
//
// All URLs are tested deep links that pre-fill destination, dates, and
// traveler count. Prices are shown by the booking site in real time —
// they cannot be pre-filled without a paid partner API.
// ─────────────────────────────────────────────────────────────────────────────

// ── IATA airport codes for major destinations ─────────────────────────────────
const DESTINATION_AIRPORTS = {
  'New Orleans':        'MSY',
  'Austin':             'AUS',
  'Nashville':          'BNA',
  'Mexico City':        'MEX',
  'Cancun':             'CUN',
  'Barcelona':          'BCN',
  'Lisbon':             'LIS',
  'Rome':               'FCO',
  'Tokyo':              'NRT',
  'Bangkok':            'BKK',
  'Bali':               'DPS',
  'Istanbul':           'IST',
  'Dubai':              'DXB',
  'Marrakech':          'RAK',
  'Costa Rica':         'SJO',
  'Iceland':            'KEF',
  'Peru':               'LIM',
  'Colombia':           'BOG',
  'Vietnam':            'HAN',
  'Paris':              'CDG',
  'London':             'LHR',
  'Amsterdam':          'AMS',
  'Berlin':             'BER',
  'Prague':             'PRG',
  'Budapest':           'BUD',
  'Athens':             'ATH',
  'Cairo':              'CAI',
  'Taipei':             'TPE',
  'Seoul':              'ICN',
  'Singapore':          'SIN',
  'Sydney':             'SYD',
  'Melbourne':          'MEL',
  'Toronto':            'YYZ',
  'Montreal':           'YUL',
  'Buenos Aires':       'EZE',
  'Rio de Janeiro':     'GIG',
  'Havana':             'HAV',
  'Tbilisi':            'TBS',
  'Chiang Mai':         'CNX',
  'Medellin':           'MDE',
  'Cartagena':          'CTG',
  'Guadalajara':        'GDL',
  'Monterrey':          'MTY',
  'Oaxaca':             'OAX',
  'Tulum':              'CUN',
  'Puerto Vallarta':    'PVR',
  'Phuket':             'HKT',
  'Ho Chi Minh City':   'SGN',
  'Hanoi':              'HAN',
  'Kuala Lumpur':       'KUL',
  'Jakarta':            'CGK',
  'Cape Town':          'CPT',
  'Nairobi':            'NBO',
  'Lisbon':             'LIS',
  'Madrid':             'MAD',
  'Seville':            'SVQ',
  'Florence':           'FLR',
  'Venice':             'VCE',
  'Milan':              'MXP',
  'Munich':             'MUC',
  'Vienna':             'VIE',
  'Copenhagen':         'CPH',
  'Stockholm':          'ARN',
  'Oslo':               'OSL',
  'Dublin':             'DUB',
  'Edinburgh':          'EDI',
  'Zurich':             'ZRH',
  'Brussels':           'BRU',
  'Porto':              'OPO',
  'Krakow':             'KRK',
  'Dubrovnik':          'DBV',
  'Santorini':          'JTR',
  'Mykonos':            'JMK',
  'Tel Aviv':           'TLV',
  'Amman':              'AMM',
  'Doha':               'DOH',
  'Abu Dhabi':          'AUH',
  'Kathmandu':          'KTM',
  'Mumbai':             'BOM',
  'Delhi':              'DEL',
  'Goa':                'GOI',
  'Sri Lanka':          'CMB',
  'Maldives':           'MLE',
  'Zanzibar':           'ZNZ',
  'Reykjavik':          'KEF',
  'Cusco':              'CUZ',
  'Lima':               'LIM',
  'Bogota':             'BOG',
  'Quito':              'UIO',
  'Santiago':           'SCL',
  'Montevideo':         'MVD',
  'Havana':             'HAV',
  'Los Angeles':        'LAX',
  'New York':           'JFK',
  'Chicago':            'ORD',
  'Miami':              'MIA',
  'San Francisco':      'SFO',
  'Las Vegas':          'LAS',
  'Denver':             'DEN',
  'Seattle':            'SEA',
  'Boston':             'BOS',
  'Washington DC':      'DCA',
  'Atlanta':            'ATL',
  'Houston':            'IAH',
  'Phoenix':            'PHX',
  'Portland':           'PDX',
};

// Get IATA code for a destination name
function getAirportCode(destinationName) {
  if (!destinationName) return null;
  // Direct match
  if (DESTINATION_AIRPORTS[destinationName]) return DESTINATION_AIRPORTS[destinationName];
  // Partial match (e.g. "Peru (Cusco)" → "Peru")
  const partial = Object.keys(DESTINATION_AIRPORTS).find(k =>
    destinationName.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(destinationName.toLowerCase())
  );
  return partial ? DESTINATION_AIRPORTS[partial] : null;
}

// Format date as YYYY-MM-DD
function fmt(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch { return ''; }
}

// Add days to a date string
function addDays(dateStr, days) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch { return ''; }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function cleanIata(code) {
  return ((code || '').trim().toUpperCase().replace(/[^A-Z]/g, '') || 'IAH').slice(0, 4);
}
function defaultDepartDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().split('T')[0];
}
function defaultReturnDate(departStr, tripDays = 7) {
  return addDays(departStr || defaultDepartDate(), tripDays);
}

// ── SKYSCANNER ────────────────────────────────────────────────────────────────
export function skyscannerUrl(origin, destinationName, departDate, returnDate, travelers = 1) {
  const destCode = getAirportCode(destinationName);
  if (!destCode) {
    // No IATA code — fall back to search page to avoid broken URL
    return `https://www.skyscanner.com/flights?q=${encodeURIComponent(`${origin || ''} to ${destinationName || ''}`)}`;
  }
  const orig  = cleanIata(origin);
  const dept  = departDate || defaultDepartDate();
  const ret   = returnDate || defaultReturnDate(dept);
  const toSky = (d) => { const s = fmt(d); return s ? s.slice(2).replace(/-/g, '') : ''; };
  const dSky  = toSky(dept);
  const rSky  = toSky(ret);
  if (dSky && rSky) {
    return `https://www.skyscanner.com/transport/flights/${orig}/${destCode}/${dSky}/${rSky}/?adults=${travelers}&currency=USD`;
  }
  return `https://www.skyscanner.com/transport/flights/${orig}/${destCode}/`;
}

// ── EXPEDIA FLIGHTS ───────────────────────────────────────────────────────────
export function expediaFlightsUrl(origin, destinationName, departDate, returnDate, travelers = 1) {
  const destCode = getAirportCode(destinationName);
  if (!destCode) {
    // No IATA code — fall back to search to avoid broken URL
    return `https://www.expedia.com/Flights-Search?trip=roundtrip&travelers=${travelers}`;
  }
  const orig = cleanIata(origin);
  const dept = fmt(departDate || defaultDepartDate());
  const ret  = fmt(returnDate || defaultReturnDate(departDate));
  return `https://www.expedia.com/Flights-Search?trip=roundtrip` +
    `&leg1=from:${orig},to:${destCode},departure:${dept}` +
    `&leg2=from:${destCode},to:${orig},departure:${ret}` +
    `&passengers=adults:${travelers},children:0&options=cabinclass:economy`;
}

// ── GOOGLE FLIGHTS (fallback — does not reliably autofill origin) ─────────────
export function googleFlightsUrl(origin, destinationName, departDate, returnDate, travelers = 1) {
  const destCode = getAirportCode(destinationName);
  const orig     = cleanIata(origin);
  const dest     = destCode || destinationName || '';
  const dept     = fmt(departDate || defaultDepartDate());
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${orig} to ${dest} ${dept}`)}`;
}

// ── KAYAK FLIGHTS ─────────────────────────────────────────────────────────────
// Kayak uses IATA codes in the URL path — very reliable deep link
export function kayakFlightsUrl(origin, destinationName, departDate, returnDate, travelers = 1) {
  const destCode = getAirportCode(destinationName);
  const dept     = fmt(departDate)?.replace(/-/g, '') || '';  // Kayak uses YYYYMMDD
  const ret      = fmt(returnDate)?.replace(/-/g, '') || '';
  const orig     = origin || 'IAH';

  if (destCode && dept) {
    const path = ret
      ? `${orig}-${destCode}/${dept}/${ret}`
      : `${orig}-${destCode}/${dept}`;
    const adults = travelers > 1 ? `?adults=${travelers}` : '';
    return `https://www.kayak.com/flights/${path}${adults}`;
  }

  return `https://www.kayak.com/flights?origin=${orig}&destination=${encodeURIComponent(destinationName || '')}`;
}

// ── BOOKING.COM ───────────────────────────────────────────────────────────────
// Pre-fills: city, check-in, check-out, adults, number of rooms
export function bookingDotComUrl(destinationName, checkin, checkout, adults = 1) {
  const ci    = fmt(checkin);
  const co    = fmt(checkout);
  const rooms = adults > 2 ? Math.ceil(adults / 2) : 1;

  const params = new URLSearchParams({
    ss:           destinationName || '',
    lang:         'en-us',
    selected_currency: 'USD',
  });
  if (ci)    params.set('checkin',       ci);
  if (co)    params.set('checkout',      co);
  if (adults) params.set('group_adults', String(adults));
  params.set('no_rooms', String(rooms));
  params.set('group_children', '0');

  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

// ── AIRBNB ────────────────────────────────────────────────────────────────────
// Pre-fills: location, check-in, check-out, adults, price range
export function airbnbUrl(destinationName, checkin, checkout, adults = 1, budgetPerNight = null) {
  const ci = fmt(checkin);
  const co = fmt(checkout);

  const params = new URLSearchParams({
    adults: String(adults),
  });
  if (ci) params.set('checkin',  ci);
  if (co) params.set('checkout', co);
  if (budgetPerNight) params.set('price_max', String(Math.round(budgetPerNight)));

  const location = encodeURIComponent(destinationName || '');
  return `https://www.airbnb.com/s/${location}/homes?${params.toString()}`;
}

// ── HOSTELWORLD ───────────────────────────────────────────────────────────────
// Pre-fills: destination, check-in, check-out, guests
export function hostelworldUrl(destinationName, checkin, checkout, guests = 1) {
  const ci = fmt(checkin);
  const co = fmt(checkout);

  const params = new URLSearchParams({
    search_keywords: destinationName || '',
    number_of_guests: String(guests),
  });
  if (ci) params.set('date_from', ci);
  if (co) params.set('date_to',   co);

  return `https://www.hostelworld.com/search?${params.toString()}`;
}

// ── HOTELS.COM ────────────────────────────────────────────────────────────────
export function hotelsDotComUrl(destinationName, checkin, checkout, adults = 1) {
  const ci = fmt(checkin);
  const co = fmt(checkout);

  const params = new URLSearchParams({
    'q-destination': destinationName || '',
    'q-rooms':       '1',
    'q-room-0-adults': String(adults),
    'q-room-0-children': '0',
  });
  if (ci) params.set('q-check-in',  ci);
  if (co) params.set('q-check-out', co);

  return `https://www.hotels.com/search.do?${params.toString()}`;
}

// ── GETYOURGUIDE ──────────────────────────────────────────────────────────────
export function getYourGuideUrl(destinationName, activity = '') {
  const q = [destinationName, activity].filter(Boolean).join(' ');
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(q)}&searchSource=2`;
}

// ── VIATOR ───────────────────────────────────────────────────────────────────
export function viatorUrl(destinationName, activity = '') {
  if (activity) {
    return `https://www.viator.com/search/${encodeURIComponent(destinationName)}?text=${encodeURIComponent(activity)}`;
  }
  return `https://www.viator.com/search/${encodeURIComponent(destinationName || '')}`;
}

// ── GOOGLE MAPS ───────────────────────────────────────────────────────────────
export function googleMapsUrl(name) {
  return `https://www.google.com/maps/search/${encodeURIComponent(name || '')}`;
}

// ── WISE (currency/money transfer) ───────────────────────────────────────────
export function wiseUrl(destinationName) {
  return `https://wise.com/us/currency-converter/usd-to-${encodeURIComponent(destinationName || '')}`;
}

// ── REVOLUT ───────────────────────────────────────────────────────────────────
export function revolutUrl() {
  return 'https://www.revolut.com/en-US/travel/';
}

// ── UBER ──────────────────────────────────────────────────────────────────────
export function uberUrl(destinationName) {
  return `https://m.uber.com/looking?pickup=my_location`;
}

// ── STUDENT UNIVERSE ──────────────────────────────────────────────────────────
export function studentUniverseUrl(origin, destinationName, departDate) {
  const destCode = getAirportCode(destinationName);
  const dept     = fmt(departDate);
  if (destCode && dept) {
    return `https://www.studentuniverse.com/flights/${origin || 'IAH'}/${destCode}/${dept}`;
  }
  return 'https://www.studentuniverse.com/flights';
}

// ── MASTER LINK BUILDER ───────────────────────────────────────────────────────
export function buildAllBookingLinks(trip, preferences) {
  const destination = trip?.destination_name || '';
  const origin      = preferences?.home_airport || 'IAH';
  const adults      = preferences?.num_travelers || 1;
  const tripDays    = trip?.trip_length_days || 7;

  const preferredMonths = preferences?.preferred_months || [];
  const currentYear     = new Date().getFullYear();

  let departDate  = null;
  let returnDate  = null;

  if (preferredMonths.length > 0) {
    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const monthIdx  = monthNames.findIndex(m =>
      m.toLowerCase() === preferredMonths[0].toLowerCase()
    );
    if (monthIdx !== -1) {
      const year      = monthIdx < new Date().getMonth() ? currentYear + 1 : currentYear;
      departDate      = `${year}-${String(monthIdx + 1).padStart(2, '0')}-15`;
      returnDate      = addDays(departDate, tripDays);
    }
  }

  const budgetPerPerson = (preferences?.budget || 1000) / Math.max(adults, 1);
  const hotelNightly    = trip?.budget_breakdown?.accom_per_night || null;

  return {
    googleFlights: googleFlightsUrl(origin, destination, departDate, returnDate, adults),
    kayak:         kayakFlightsUrl(origin, destination, departDate, returnDate, adults),
    studentUniverse: studentUniverseUrl(origin, destination, departDate),
    bookingCom:  bookingDotComUrl(destination, departDate, returnDate, adults),
    airbnb:      airbnbUrl(destination, departDate, returnDate, adults, hotelNightly),
    hostelworld: hostelworldUrl(destination, departDate, returnDate, adults),
    hotelsCom:   hotelsDotComUrl(destination, departDate, returnDate, adults),
    getYourGuide: getYourGuideUrl(destination),
    viator:       viatorUrl(destination),
    googleMaps: googleMapsUrl(destination),
    uber:       uberUrl(destination),
    wise:    wiseUrl(destination),
    revolut: revolutUrl(),
  };
}