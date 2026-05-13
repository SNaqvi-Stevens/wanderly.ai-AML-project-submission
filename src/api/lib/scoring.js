// Wanderly Scoring Engine — pure function for ranking destinations
import { DESTINATIONS, AIRPORT_CODES } from './destinations';

// Get the closest hub airport for flight cost estimation
function getClosestHub(homeAirport) {
  const hubMapping = {
    JFK: 'JFK', EWR: 'JFK', LGA: 'JFK', BOS: 'JFK', PHL: 'JFK', IAD: 'JFK', DCA: 'JFK',
    LAX: 'LAX', SFO: 'LAX', SAN: 'LAX', SNA: 'LAX', PHX: 'LAX', LAS: 'LAX', PDX: 'LAX', SEA: 'LAX',
    ORD: 'ORD', DTW: 'ORD', MSP: 'ORD', STL: 'ORD', MKE: 'ORD', IND: 'ORD', CVG: 'ORD', CLE: 'ORD',
    IAH: 'IAH', DFW: 'IAH', AUS: 'IAH', SAT: 'IAH', MSY: 'IAH', OKC: 'IAH', TUL: 'IAH', BNA: 'IAH',
    MIA: 'MIA', FLL: 'MIA', TPA: 'MIA', MCO: 'MIA', ATL: 'MIA', CLT: 'MIA', JAX: 'MIA', RDU: 'MIA',
  };
  return hubMapping[homeAirport] || 'IAH';
}

// Score a single destination against user preferences
export function scoreDestination(destination, preferences) {
  const hub = getClosestHub(preferences.home_airport || 'IAH');
  const flightCost = destination.flight_estimates[hub] || 400;
  const numTravelers = preferences.num_travelers || 1;
  const budget = preferences.budget || 1000;
  const perPersonBudget = budget / numTravelers;
  const tripDays = Math.round((preferences.min_days + preferences.max_days) / 2) || 5;

  // Estimate total cost per person
  const accomTier = perPersonBudget < 400 ? 'hostel_dorm' : perPersonBudget < 800 ? 'hostel_private' : perPersonBudget < 1500 ? 'budget' : perPersonBudget < 3000 ? 'mid' : 'boutique';
  const foodTier = perPersonBudget < 400 ? 'street' : perPersonBudget < 800 ? 'casual' : perPersonBudget < 1500 ? 'casual' : perPersonBudget < 3000 ? 'mid' : 'mid';

  const accomPerNight = destination.hotel_per_night[accomTier] || destination.hotel_per_night.budget || 50;
  const foodPerDay = destination.food_daily[foodTier] || destination.food_daily.casual || 15;
  const activitiesBudget = perPersonBudget < 500 ? 20 : perPersonBudget < 1000 ? 60 : perPersonBudget < 2000 ? 150 : 300;
  const transportDaily = perPersonBudget < 500 ? 5 : 15;

  // ── TOTAL COST FOR ENTIRE GROUP ──────────────────────────────────────────────
  // Flights: per person × travelers
  // Accommodation: per room × nights (rooms = ceil(travelers/2), shared)
  // Food, activities, transport: per person × travelers
  const numRooms = Math.ceil(numTravelers / 2);
  const nights = tripDays - 1;

  const totalCostBudget = (flightCost * numTravelers)
    + (accomPerNight * nights * numRooms)
    + (foodPerDay * tripDays * numTravelers)
    + (activitiesBudget * numTravelers)
    + (transportDaily * tripDays * numTravelers);

  const midAccom    = destination.hotel_per_night.mid      || accomPerNight * 2;
  const midFood     = destination.food_daily.mid            || foodPerDay * 2;
  const splurgeAccom = destination.hotel_per_night.boutique || accomPerNight * 3;
  const splurgeFood  = destination.food_daily.upscale       || foodPerDay * 3;

  const totalCostComfortable = (flightCost * numTravelers)
    + (midAccom * nights * numRooms)
    + (midFood * tripDays * numTravelers)
    + (activitiesBudget * 2 * numTravelers)
    + (transportDaily * 1.5 * tripDays * numTravelers);

  const totalCostSplurge = (flightCost * numTravelers)
    + (splurgeAccom * nights * numRooms)
    + (splurgeFood * tripDays * numTravelers)
    + (activitiesBudget * 3 * numTravelers)
    + (transportDaily * 2 * tripDays * numTravelers);

  // Per-person share (for budget_fit scoring)
  const totalCostPerPerson = totalCostBudget / numTravelers;

  // Budget fit score (0-100) — compare TOTAL group cost vs TOTAL budget
  let budgetFit = 0;
  const totalBudget = budget; // preferences.budget is already the total for all travelers
  if (totalCostBudget <= totalBudget) {
    budgetFit = 90 + Math.min(10, ((totalBudget - totalCostBudget) / totalBudget) * 20);
  } else if (totalCostBudget <= totalBudget * 1.15) {
    budgetFit = 60 + ((totalBudget * 1.15 - totalCostBudget) / (totalBudget * 0.15)) * 30;
  } else if (totalCostBudget <= totalBudget * 1.5) {
    budgetFit = 20 + ((totalBudget * 1.5 - totalCostBudget) / (totalBudget * 0.35)) * 40;
  } else {
    budgetFit = Math.max(0, 20 - ((totalCostBudget - totalBudget * 1.5) / totalBudget) * 40);
  }

  // Season score
  const preferredMonths = (preferences.preferred_months || []).map(m => {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months.indexOf(m) + 1;
  }).filter(m => m > 0);
  
  let seasonScore = 70;
  if (preferredMonths.length > 0) {
    const bestMonthScore = Math.max(...preferredMonths.map(m => destination.season_scores[m] || 5));
    seasonScore = bestMonthScore * 10;
  } else {
    const bestMonth = Math.max(...Object.values(destination.season_scores));
    seasonScore = bestMonth * 10;
  }

  // Interest match score
  const userInterests = (preferences.interests || []).map(i => i.toLowerCase().replace(/ /g, '_'));
  const destInterests = destination.interests || [];
  const matchCount = userInterests.filter(i => destInterests.includes(i)).length;
  const matchScore = userInterests.length > 0 ? (matchCount / userInterests.length) * 100 : 50;

  // Vibe match bonus
  const userVibes = (preferences.trip_vibes || []).map(v => v.toLowerCase().replace(/ /g, '_'));
  const destVibes = destination.vibes || [];
  const vibeMatch = userVibes.filter(v => destVibes.includes(v)).length;
  const vibeBonus = userVibes.length > 0 ? (vibeMatch / userVibes.length) * 20 : 0;

  // Feasibility
  let feasibility = 80;
  if (destination.visa === "N/A" || destination.visa?.includes("No visa")) feasibility += 10;
  else if (destination.visa?.includes("E-visa") || destination.visa?.includes("Visa on arrival")) feasibility += 5;
  else feasibility -= 10;
  
  if (flightCost === 0) feasibility += 10; // domestic / home city
  if (tripDays < 4 && flightCost > 400) feasibility -= 15; // too far for short trip
  if (preferences.dietary?.includes('halal') && destination.halal_friendly === "Excellent") feasibility += 10;
  if (preferences.dietary?.includes('halal') && destination.halal_friendly === "Very Limited") feasibility -= 15;

  feasibility = Math.min(100, Math.max(0, feasibility));

  // Overall (budget is now heaviest at 50%)
  const overall = Math.round(budgetFit * 0.50 + seasonScore * 0.15 + matchScore * 0.20 + feasibility * 0.10 + vibeBonus * 0.5 + 5);

  // Determine season label
  let seasonLabel = "Shoulder";
  if (preferredMonths.length > 0) {
    const avgCrowd = preferredMonths.reduce((sum, m) => sum + (destination.crowd[m] || 5), 0) / preferredMonths.length;
    if (avgCrowd >= 7) seasonLabel = "Peak";
    else if (avgCrowd <= 3) seasonLabel = "Off-Peak";
  }

  // Find best travel window
  let bestMonth = 1;
  let bestScore = 0;
  for (const m of (preferredMonths.length > 0 ? preferredMonths : Object.keys(destination.season_scores).map(Number))) {
    const s = destination.season_scores[m] || 5;
    if (s > bestScore) { bestScore = s; bestMonth = m; }
  }

  return {
    destination,
    scores: {
      season: Math.round(seasonScore),
      budget_fit: Math.round(budgetFit),
      match: Math.round(matchScore + vibeBonus),
      feasibility: Math.round(feasibility),
      overall: Math.min(100, Math.round(overall)),
    },
    costs: {
      budget:          Math.round(totalCostBudget),       // total for all travelers
      comfortable:     Math.round(totalCostComfortable),  // total for all travelers
      splurge:         Math.round(totalCostSplurge),      // total for all travelers
      per_person_budget: Math.round(totalCostPerPerson),  // per-person share
      flight_per_person: flightCost,
      accom_per_night:   accomPerNight,
      food_per_day:      foodPerDay,
    },
    season_label: seasonLabel,
    best_month: bestMonth,
    trip_days: tripDays,
    preference_matches: userInterests.filter(i => destInterests.includes(i)),
  };
}

// Rank all destinations for given preferences, return top N
export function rankDestinations(preferences, topN = 5) {
  const budget = preferences.budget || 1000;
  const numTravelers = preferences.num_travelers || 1;
  const perPerson = budget / numTravelers;
  const budgetStyle = preferences?.budget_style || 'flexible'; // 'strict' | 'flexible' | 'show_everything'

  // Filter destinations pool based on budget
  let pool = [...DESTINATIONS];
  
  // For very low budgets, prioritize domestic and nearby
  if (perPerson < 500) {
    pool = pool.filter(d => 
      d.region.includes("Domestic") || d.region === "Central America" || d.region === "Caribbean" ||
      d.daily_cost < 40
    );
  }

  // Score all destinations first so we can filter by actual computed costs
  const jitter = () => Math.floor(Math.random() * 10) - 5;
  const allScored = pool.map(d => {
    const s = scoreDestination(d, preferences);
    s.scores.overall = Math.min(100, Math.max(0, s.scores.overall + jitter()));
    return s;
  });

  // ── BUDGET FILTER ──────────────────────────────────────────────────────────
  // costs.budget = correct TOTAL for all travelers
  // budget = user's TOTAL budget for all travelers
  // Always return results — attach a budget_warning flag when over budget

  const filterBy = (mult) => allScored.filter(s => s.costs.budget <= budget * mult);

  let scored;
  let budgetWarning = null; // null = fine, string = disclaimer message

  if (budgetStyle === 'show_everything') {
    scored = allScored;

  } else if (budgetStyle === 'strict') {
    scored = filterBy(1.0);
    if (scored.length < 3) scored = filterBy(1.05);
    if (scored.length < 3) scored = filterBy(1.10);
    if (scored.length === 0) {
      // Nothing fits at all — show closest options with disclaimer
      scored = [...allScored].sort((a, b) => a.costs.budget - b.costs.budget);
      budgetWarning = 'strict_no_results';
    }

  } else {
    // flexible: up to 10% over budget
    scored = filterBy(1.10);
    if (scored.length < 3) scored = filterBy(1.20);
    if (scored.length === 0) {
      // Nothing fits — show closest options with disclaimer
      scored = [...allScored].sort((a, b) => a.costs.budget - b.costs.budget);
      budgetWarning = 'flexible_no_results';
    }
  }

  // Sort by overall score
  scored.sort((a, b) => b.scores.overall - a.scores.overall);
  const results = scored.slice(0, topN);

  // Attach budget_warning to each result so Results.jsx can show disclaimer
  if (budgetWarning) {
    results.forEach(r => { r.budget_warning = budgetWarning; });
  } else {
    // Check if any result is over budget — tag individually
    results.forEach(r => {
      if (r.costs.budget > budget * 1.0 && budgetStyle === 'strict') {
        r.budget_warning = 'over_strict';
      } else if (r.costs.budget > budget * 1.10 && budgetStyle === 'flexible') {
        r.budget_warning = 'over_flexible';
      } else {
        r.budget_warning = null;
      }
    });
  }

  return results;
}

// Get best weather ranked
export function rankByWeather(preferences, topN = 5) {
  const scored = rankDestinations(preferences, 15);
  scored.sort((a, b) => b.scores.season - a.scores.season);
  return scored.slice(0, topN);
}

// Get best value ranked
export function rankByValue(preferences, topN = 5) {
  const scored = rankDestinations(preferences, 15);
  scored.sort((a, b) => b.scores.budget_fit - a.scores.budget_fit);
  return scored.slice(0, topN);
}