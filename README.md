<div align="center">

<h1 style="font-family: Georgia, serif; color: #0D6E60; font-size: 3em; font-weight: bold; letter-spacing: -1px;">Wanderly</h1>
<p style="color: #17A08E; font-style: italic; font-size: 1.1em;">Your Personal AI Travel Agent</p>

<br/>

[![Live App](https://img.shields.io/badge/Live_App-wanderly--trip--craft.base44.app-0D6E60?style=for-the-badge&logoColor=white)](https://wanderly-trip-craft.base44.app)
[![No Login Required](https://img.shields.io/badge/Browse-No_Login_Required-17A08E?style=for-the-badge)](https://wanderly-trip-craft.base44.app/browse)
[![ML Powered](https://img.shields.io/badge/ML-GradientBoostingRegressor-1E2D2D?style=for-the-badge)](https://wanderly-trip-craft.base44.app)

**AAI 595 Applied Machine Learning &nbsp;|&nbsp; Group 13 &nbsp;|&nbsp; Stevens Institute of Technology &nbsp;|&nbsp; Spring 2026**

*Saanie Naqvi &nbsp;·&nbsp; Preksha Shah &nbsp;·&nbsp; Tinotenda Kadzimu &nbsp;·&nbsp; Dr. Han*

</div>

---

## What Is Wanderly?

Wanderly replaces the 38-tab travel planning nightmare with one intelligent, budget-aware AI agent. Enter your budget, who's coming, where you're flying from, and what you care about. Everything else is handled.

```
You:       $2,000 · 2 travelers · IAH · food + culture · halal · June
Wanderly:  Ranked destinations  →  Complete trip plans  →  10 AI tabs  →  Live booking links
```

> No login required to browse or plan. Sign up only when you want to save trips.

---

## Features

| Feature | Details |
|---------|---------|
| ML-Powered Ranking | GradientBoostingRegressor ranks 57+ destinations by budget fit, season, interests and feasibility |
| Real Budget Math | Group-total formula: `flights x travelers + hotel x nights x rooms + food + activities` |
| Calendar-Aware | Upload `.ics` files (Google, Outlook, Apple) to block travel dates automatically |
| 10 AI Trip Tabs | Flights · Stay · Food · Activities · Transport · Budget · Itinerary · Money · Packing · Overview |
| Any Destination | BrowseAndBudget generates full plans + AI hero images for any city worldwide |
| Live Booking Links | Skyscanner · Expedia · Kayak · Booking.com · Airbnb · Hostelworld — dates and travelers pre-filled |
| Drive Estimator | "Not flying?" — Claude API estimates distance, hours and gas cost for road trips |
| Dietary Aware | Halal, vegetarian, kosher enforced at 3 layers: scoring, LLM prompt, JSON schema |
| 3 AI Assistants | Chat to refine trips, adjust budget, or update preferences in real time |

---

## Live Demo

**[wanderly-trip-craft.base44.app](https://wanderly-trip-craft.base44.app)**

No installation. No account. Just open and go.

### Recommended Demo Path

```
1.  Landing page  →  click "Plan a Trip"
2.  Onboarding:   budget $2,000 · 2 travelers · IAH · food + culture · June
3.  Results:      ML-ranked destinations with budget fit scores
4.  Click a trip  →  explore all 10 AI-generated tabs
5.  DevTools (F12) → Console → see ML training output live
```

### ML Output in DevTools Console

```
[Wanderly ML] GradientBoostingRegressor trained
MAE: 2.09 | RMSE: 2.83 | Baseline: 39.07 | Improvement: 94.6%
Top feature: cost_ratio (35.6%)
```

---

## ML Model

### GradientBoostingRegressor — Live in Browser

The model trains **client-side in < 2 seconds** on every Results page load. No server. No API credits for ranking.

```
800 synthetic samples  →  640 train / 160 test (80/20)
80 trees · depth 4 · lr 0.1 · subsample 0.8
```

### Evaluation Results

| Metric | Score | What It Means |
|--------|-------|---------------|
| Model MAE | 2.09 pts | Within 2 points on average (0–100 scale) |
| Model RMSE | 2.83 pts | No catastrophic errors in the distribution |
| Baseline MAE | 39.07 pts | Naive mean predictor — no model intelligence |
| Improvement | 94.6% | Better than predicting the mean every time |
| Kendall's Tau | 0.880 | Strong ML vs rule-based rank agreement |
| NDCG@6 | 1.000 | In-budget destinations ranked first, every time |
| Pairwise Accuracy | 83.5% | Correctly orders cheaper destinations above expensive |
| Results in Budget | 95% | 37/39 results within budget across 10 test scenarios |

### Top Feature Importances

```
cost_ratio          [####################################]  35.6%   model learned the right signal
budget_per_person   [################                   ]  14.2%
total_cost_estimate [########                           ]   8.6%
flight_cost         [########                           ]   7.9%
accom_per_night     [######                             ]   6.3%
trip_days           [######                             ]   6.0%
```

### Scoring Formula

```
ML Overall = (Budget Fit x 0.50) + (Season x 0.15) + (Interest Match x 0.20) + (Feasibility x 0.10) + jitter(+/-5)
```

---

## Price Accuracy (May 2026)

Knowledge base updated from original ~2023 AI-generated pricing to 2026 market rates.

### Flights — vs Skyscanner, IAH, Jun 15–22 2026

| Destination | Wanderly | Real | Delta | |
|-------------|----------|------|-------|---|
| New York City | $200 | $197 | 2% | within 20% |
| Mexico City | $260 | $315 | 17% | within 20% |
| Cancun | $255 | $206 | 24% | slightly over |
| Barcelona | $860 | $714 | 20% | at threshold |
| Tokyo | $1,200 | $986 | 22% | slightly over |
| **Flight MAPE** | | | **17.0%** | |

### Hotels — vs Booking.com, per night

| Destination | Wanderly Budget | Real Cheapest | Delta | Wanderly Mid | Real Mid | Delta |
|-------------|----------------|---------------|-------|--------------|----------|-------|
| Mexico City | $38 | $35 | 9% | $68 | $66 | 3% |
| Cancun | $42 | $41 | 2% | $90 | $89 | 1% |
| Barcelona | $72 | $70 | 3% | $135 | $130 | 4% |
| Tokyo | $68 | $65 | 5% | $125 | $120 | 4% |
| New York | $125 | $120 | 4% | $225 | $220 | 2% |
| **Hotel MAPE** | | | **3.7%** | | | All within 10% |

Hotels are essentially calibrated to current market rates. Flight estimates are best-effort approximations — all booking links direct to live Skyscanner/Expedia pricing.

---

## Team

<table>
<tr>
<th>Name</th>
<th>Role</th>
<th>Contributions</th>
</tr>
<tr>
<td><strong>Saanie Naqvi</strong></td>
<td>Lead Developer</td>
<td>ML model (JS + Python), scoring engine, group cost formula, budget filter, booking links, knowledge base update, price evaluation, all tab bug fixes, auth fix, public route implementation, documentation, evaluation spreadsheet, all final deliverables</td>
</tr>
<tr>
<td>Preksha Shah</td>
<td>Team Member</td>
<td>App design input and testing</td>
</tr>
<tr>
<td>Tinotenda Kadzimu</td>
<td>Team Member</td>
<td>App design input and testing</td>
</tr>
</table>

---

## Repo Structure

```
wanderly/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx            public homepage
│   │   ├── Onboarding.jsx         5-step trip planner (no login required)
│   │   ├── Results.jsx            ML-ranked results + chat assistant
│   │   ├── TripDetail.jsx         10 AI tabs per destination
│   │   ├── BrowseAndBudget.jsx    explore any destination (no login)
│   │   ├── MyTrips.jsx            saved trips (login required)
│   │   ├── SavedTrips.jsx         favorites (login required)
│   │   └── Profile.jsx            account settings (login required)
│   │
│   ├── components/wanderly/
│   │   ├── tabs/
│   │   │   ├── FlightsTab.jsx          flights + Skyscanner/Expedia links
│   │   │   ├── AccommodationTab.jsx    hotels + Booking.com/Airbnb links
│   │   │   ├── FoodTab.jsx             restaurants + dietary filtering
│   │   │   ├── BudgetTab.jsx           full group cost breakdown
│   │   │   ├── ItineraryTab.jsx        day-by-day schedule
│   │   │   ├── AlternativeTransport.jsx   Claude API drive estimator
│   │   │   └── ...5 more tabs
│   │   ├── TripCard.jsx           destination card with ML score
│   │   ├── BudgetTracker.jsx      real-time budget visualization
│   │   └── TripDocumentFolder.jsx  PDF export + document storage
│   │
│   └── lib/
│       ├── mlEngine.js            GradientBoostingRegressor (JavaScript)
│       ├── scoring.js             rule-based scoring + hub airport mapping
│       ├── destinations.js        57-destination knowledge base (2026 prices)
│       └── bookingLinks.js        deep link generators (8 providers)
│
└── base44/entities/
    ├── UserPreferences.jsonc      budget, airport, interests, dietary, dates
    ├── Trip.jsonc                 ranked results with scores + cost breakdown
    └── SavedItem.jsonc            favorited destinations
```

---

## AI and ML Stack

### GradientBoostingRegressor (JavaScript — live in app)

```javascript
export function mlRankDestinations(preferences, topN = 6) {
  ensureTrained();  // trains on first call, < 2 seconds
  // returns top N destinations ranked by budget fit score
}
```

### GPT-4o-mini via Base44

```javascript
const result = await InvokeLLM({
  prompt: buildFlightsPrompt(destination, preferences),
  response_json_schema: FlightsTabSchema,  // typed output, zero parse failures
});
```

### Anthropic Claude API

```javascript
// AlternativeTransport.jsx
const response = await fetch("https://api.anthropic.com/v1/messages", {
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    messages: [{ role: "user", content: driveEstimatePrompt }]
  })
});
```

---

## Local Setup

```bash
git clone [repo-url]
cd Wanderly.ai_Final
npm install

# Create .env.local
VITE_BASE44_APP_ID=your_app_id_here

npm run dev
# runs at http://localhost:5173
```

The ML model trains automatically on the Results page. Check DevTools Console for output.

---

## Destinations — 57 Curated + Any City via AI

```
US              New Orleans · Austin · Nashville · San Antonio · Miami · NYC · Chicago · Denver · Portland
Mexico          Mexico City · Guadalajara · Oaxaca · Puerto Escondido · Cancun · Puerto Vallarta
Latin America   Guatemala · Medellin · Cartagena · Costa Rica · Lima & Cusco
Europe          Barcelona · Madrid · Lisbon · Porto · Paris · Amsterdam · Rome · Prague · Krakow · Croatia · Istanbul
Asia            Tokyo · Kyoto · Bangkok · Bali · Vietnam · Philippines · Singapore · Morocco
Middle East     Dubai · Jordan
Pacific         Sydney · New Zealand
+ Any City      BrowseAndBudget generates full plans for anywhere in the world
```

---

## Known Limitations

- Flight estimates are 17–24% off for some routes — booking links direct to live Skyscanner/Expedia prices. Fix: Amadeus API integration
- ML trained on synthetic data — real user favorites/bookings would improve the model. Trip entity stores `is_favorited` and `planning_status` for future retraining
- Base44 vendor dependency — auth, database, and AI API are coupled to one SDK
- 57 curated destinations — BrowseAndBudget extends to any city via AI generation

---

## What's Next

- [ ] Amadeus API — live flight pricing (free tier: 2,000 calls/month)
- [ ] Hotel rates API — replace static estimates with real-time data
- [ ] ML retraining — use real user interactions as training labels
- [ ] Multi-provider backend — decouple from Base44 for production scale

---

<div align="center">

*Wanderly.ai &nbsp;·&nbsp; AAI 595 Applied Machine Learning &nbsp;·&nbsp; Stevens Institute of Technology &nbsp;·&nbsp; Spring 2026*

[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev)
[![Base44](https://img.shields.io/badge/Base44-Backend_+_AI-0D6E60?style=flat)](https://base44.com)
[![Claude API](https://img.shields.io/badge/Claude_API-Drive_Estimator-D97757?style=flat)](https://anthropic.com)

</div>
