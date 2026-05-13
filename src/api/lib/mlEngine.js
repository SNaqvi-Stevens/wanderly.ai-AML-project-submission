// ─────────────────────────────────────────────────────────────────────────────
// Wanderly.ai — In-Browser ML Engine
// src/lib/mlEngine.js
//
// GradientBoostingRegressor trained in the browser on synthetic data.
// The model predicts budget_fit (0-100) for each destination.
// This value replaces the rule-based budget_fit score on TripCards when
// ML mode is active — making the ML output directly visible and testable.
//
// To test: run onboarding → switch ML/Rule-Based toggle → watch Budget
// score bars change on every card. That number comes from the ML model.
// ─────────────────────────────────────────────────────────────────────────────

import { DESTINATIONS } from './destinations';
import { scoreDestination } from './scoring';

// ── FEATURE NAMES ─────────────────────────────────────────────────────────────
export const FEATURE_NAMES = [
  'budget_per_person',
  'trip_days',
  'num_travelers',
  'dest_daily_cost',
  'flight_cost',
  'accom_per_night',
  'food_per_day',
  'total_cost_estimate',
  'cost_ratio',           // total_cost / budget_per_person
  'dest_avg_season',
  'dest_halal_score',
  'n_user_interests',
  'halal_requested',
  'visa_score',           // 1=no visa, 0.7=evisa, 0.4=required
];

// ── SEEDED RNG ────────────────────────────────────────────────────────────────
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── DESTINATION HELPERS ───────────────────────────────────────────────────────
function getHalalScore(dest) {
  const h = dest.halal_friendly || '';
  if (h === 'Excellent')           return 1.0;
  if (h === 'Very Good')           return 0.85;
  if (h === 'Good')                return 0.7;
  if (h === 'Moderate')            return 0.55;
  if (h.startsWith('Limited but')) return 0.4;
  if (h === 'Limited')             return 0.3;
  if (h === 'Very Limited')        return 0.1;
  return 0.35;
}

function getVisaScore(dest) {
  const v = dest.visa || '';
  if (v === 'N/A' || v.includes('No visa')) return 1.0;
  if (v.includes('E-visa') || v.includes('on arrival')) return 0.7;
  return 0.4;
}

function getAvgSeason(dest) {
  const vals = Object.values(dest.season_scores || {});
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
}

function getClosestHub(homeAirport) {
  const map = {
    JFK:'JFK', EWR:'JFK', LGA:'JFK', BOS:'JFK', PHL:'JFK',
    LAX:'LAX', SFO:'LAX', SAN:'LAX', LAS:'LAX', SEA:'LAX',
    ORD:'ORD', DTW:'ORD', MSP:'ORD', STL:'ORD', MKE:'ORD',
    IAH:'IAH', DFW:'IAH', AUS:'IAH', SAT:'IAH', MSY:'IAH',
    MIA:'MIA', FLL:'MIA', TPA:'MIA', MCO:'MIA', ATL:'MIA',
  };
  return map[homeAirport] || 'IAH';
}

// ── FEATURE EXTRACTION ────────────────────────────────────────────────────────
// Extracts 14 features focused on budget prediction specifically
export function extractFeatures(dest, preferences) {
  const numTravelers  = preferences.num_travelers || 1;
  const budget        = preferences.budget || 1000;  // total budget for all travelers
  const perPerson     = budget / Math.max(numTravelers, 1);
  const tripDays      = Math.round(((preferences.min_days || 4) + (preferences.max_days || 7)) / 2);
  const hub           = getClosestHub(preferences.home_airport || 'IAH');
  const flightCost    = dest.flight_estimates?.[hub] || 400;
  const halalReq      = (preferences.dietary || []).some(d => d.toLowerCase().includes('halal')) ? 1 : 0;
  const nInterests    = (preferences.interests || []).length;

  // Estimate accommodation and food tiers based on per-person budget
  const accomTier = perPerson < 400 ? 'hostel_dorm'
    : perPerson < 800  ? 'hostel_private'
    : perPerson < 1500 ? 'budget'
    : perPerson < 3000 ? 'mid'
    : 'boutique';
  const foodTier  = perPerson < 800 ? 'street'
    : perPerson < 1500 ? 'casual'
    : 'mid';

  const accomPerNight = dest.hotel_per_night?.[accomTier] || dest.hotel_per_night?.budget || 50;
  const foodPerDay    = dest.food_daily?.[foodTier] || dest.food_daily?.casual || 15;
  const activitiesBudget = perPerson < 500 ? 20 : perPerson < 1000 ? 60 : perPerson < 2000 ? 150 : 300;
  const transportDaily   = perPerson < 500 ? 5 : 15;

  // ── TOTAL GROUP COST (mirrors scoring.js exactly) ──────────────────────────
  // Flights: per person × travelers
  // Accommodation: per room × nights (rooms = ceil(travelers/2), shared)
  // Food, activities, transport: per person × travelers
  const numRooms  = Math.ceil(numTravelers / 2);
  const nights    = tripDays - 1;
  const totalGroupCost =
    (flightCost * numTravelers)
    + (accomPerNight * nights * numRooms)
    + (foodPerDay * tripDays * numTravelers)
    + (activitiesBudget * numTravelers)
    + (transportDaily * tripDays * numTravelers);

  // cost_ratio: total group cost vs total budget — captures how budget stretches across all travelers
  const costRatio = totalGroupCost / Math.max(budget, 1);

  return [
    Math.min(perPerson, 10000)          / 10000,   // budget_per_person (normalized)
    Math.min(tripDays, 21)              / 21,       // trip_days
    Math.min(numTravelers, 8)           / 8,        // num_travelers
    Math.min(dest.daily_cost || 50, 300)/ 300,      // dest_daily_cost
    Math.min(flightCost, 2000)          / 2000,     // flight_cost (per person)
    Math.min(accomPerNight, 500)        / 500,      // accom_per_night (per room)
    Math.min(foodPerDay, 150)           / 150,      // food_per_day (per person)
    Math.min(totalGroupCost, 30000)     / 30000,    // total_cost_estimate (ALL travelers)
    Math.min(costRatio, 3)              / 3,        // cost_ratio: group cost / total budget
    getAvgSeason(dest)                  / 10,       // dest_avg_season
    getHalalScore(dest),                            // dest_halal_score
    Math.min(nInterests, 10)            / 10,       // n_user_interests
    halalReq,                                       // halal_requested
    getVisaScore(dest),                             // visa_score
  ];
}

// ── COMPUTE TRUE BUDGET FIT (mirrors scoring.js formula exactly) ──────────────
// Used as the training label — what the model learns to predict
// Exact replica of scoring.js budget fit calculation — must stay in sync
function computeBudgetFit(dest, preferences) {
  const numTravelers  = preferences.num_travelers || 1;
  const budget        = preferences.budget || 1000;  // total budget for all travelers
  const perPerson     = budget / Math.max(numTravelers, 1);
  const tripDays      = Math.round(((preferences.min_days || 4) + (preferences.max_days || 7)) / 2);
  const hub           = getClosestHub(preferences.home_airport || 'IAH');
  const flightCost    = dest.flight_estimates?.[hub] || 400;

  const accomTier = perPerson < 400  ? 'hostel_dorm'
    : perPerson < 800  ? 'hostel_private'
    : perPerson < 1500 ? 'budget'
    : perPerson < 3000 ? 'mid'
    : 'boutique';
  const foodTier = perPerson < 400  ? 'street'
    : perPerson < 800  ? 'casual'
    : perPerson < 1500 ? 'casual'
    : perPerson < 3000 ? 'mid'
    : 'mid';

  const accomPerNight    = dest.hotel_per_night?.[accomTier] || dest.hotel_per_night?.budget || 50;
  const foodPerDay       = dest.food_daily?.[foodTier] || dest.food_daily?.casual || 15;
  const activitiesBudget = perPerson < 500 ? 20 : perPerson < 1000 ? 60 : perPerson < 2000 ? 150 : 300;
  const transportDaily   = perPerson < 500 ? 5 : 15;

  // ── TOTAL GROUP COST — mirrors scoring.js exactly ───────────────────────
  const numRooms  = Math.ceil(numTravelers / 2);
  const nights    = tripDays - 1;
  const totalGroupCost =
    (flightCost * numTravelers)
    + (accomPerNight * nights * numRooms)
    + (foodPerDay * tripDays * numTravelers)
    + (activitiesBudget * numTravelers)
    + (transportDaily * tripDays * numTravelers);

  // Compare TOTAL group cost vs TOTAL budget (not per-person)
  let budgetFit = 0;
  if (totalGroupCost <= budget)
    budgetFit = 90 + Math.min(10, ((budget - totalGroupCost) / budget) * 20);
  else if (totalGroupCost <= budget * 1.15)
    budgetFit = 60 + ((budget * 1.15 - totalGroupCost) / (budget * 0.15)) * 30;
  else if (totalGroupCost <= budget * 1.5)
    budgetFit = 20 + ((budget * 1.5 - totalGroupCost) / (budget * 0.35)) * 40;
  else
    budgetFit = Math.max(0, 20 - ((totalGroupCost - budget * 1.5) / budget) * 40);

  return Math.min(100, Math.max(0, budgetFit));
}

// ── SYNTHETIC TRAINING DATA ───────────────────────────────────────────────────
// Generates (features, budget_fit_label) pairs
// The model learns to predict budget_fit from raw trip inputs
const INTEREST_POOL   = ['food','beach','outdoor','nightlife','culture','history',
                         'architecture','shopping','nature','adventure','music',
                         'wellness','museums','luxury','off_beaten_path'];
const BUDGET_OPTIONS  = [400, 600, 800, 1000, 1200, 1500, 2000, 3000, 5000];
const TRAVELER_OPTIONS= [1, 1, 1, 2, 2, 4];
const MONTH_NAMES     = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
const AIRPORTS        = ['IAH','JFK','LAX','ORD','MIA'];

function generateTrainingData(nSamples, seed) {
  const rng = seededRng(seed);
  const X = [], y = [];

  for (let i = 0; i < nSamples; i++) {
    const budget       = BUDGET_OPTIONS[Math.floor(rng() * BUDGET_OPTIONS.length)];
    const numTravelers = TRAVELER_OPTIONS[Math.floor(rng() * TRAVELER_OPTIONS.length)];
    const tripDays     = Math.floor(rng() * 11) + 4;
    const nInterests   = Math.floor(rng() * 4) + 2;
    const shuffled     = [...INTEREST_POOL].sort(() => rng() - 0.5);
    const interests    = shuffled.slice(0, nInterests);
    const halalReq     = rng() < 0.25;
    const preferred_months = rng() < 0.6
      ? [MONTH_NAMES[Math.floor(rng() * 12)]]
      : [];

    const prefs = {
      budget, num_travelers: numTravelers,
      min_days: tripDays - 1, max_days: tripDays + 1,
      interests, dietary: halalReq ? ['halal'] : [],
      preferred_months,
      home_airport: AIRPORTS[Math.floor(rng() * AIRPORTS.length)],
      trip_vibes: [],
    };

    const dest = DESTINATIONS[Math.floor(rng() * DESTINATIONS.length)];

    // Label: the true budget_fit from scoring.js formula + small noise
    const trueBudgetFit = computeBudgetFit(dest, prefs);
    const noise = (rng() - 0.5) * 6; // ±3 pts noise
    const label = Math.min(1, Math.max(0, (trueBudgetFit + noise) / 100));

    X.push(extractFeatures(dest, prefs));
    y.push(label);
  }

  return { X, y };
}

// ── DECISION TREE ─────────────────────────────────────────────────────────────
class DecisionTree {
  constructor(maxDepth = 4, minSamples = 5) {
    this.maxDepth   = maxDepth;
    this.minSamples = minSamples;
    this.root       = null;
  }

  _mse(vals) {
    if (!vals.length) return 0;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  }

  _bestSplit(X, y) {
    let bestGain = -Infinity, bestFeat = -1, bestThresh = 0;
    const parentMse = this._mse(y);
    const nFeats    = X[0].length;
    for (let feat = 0; feat < nFeats; feat++) {
      const unique = [...new Set(X.map(r => r[feat]))].sort((a, b) => a - b);
      for (let t = 0; t < unique.length - 1; t++) {
        const thresh = (unique[t] + unique[t + 1]) / 2;
        const lY = [], rY = [];
        for (let i = 0; i < X.length; i++)
          (X[i][feat] <= thresh ? lY : rY).push(y[i]);
        if (lY.length < this.minSamples || rY.length < this.minSamples) continue;
        const gain = parentMse
          - (lY.length / y.length) * this._mse(lY)
          - (rY.length / y.length) * this._mse(rY);
        if (gain > bestGain) { bestGain = gain; bestFeat = feat; bestThresh = thresh; }
      }
    }
    return { feat: bestFeat, thresh: bestThresh, gain: bestGain };
  }

  _build(X, y, depth) {
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    if (depth >= this.maxDepth || y.length <= this.minSamples)
      return { leaf: true, value: mean };
    const { feat, thresh, gain } = this._bestSplit(X, y);
    if (gain <= 0 || feat === -1) return { leaf: true, value: mean };
    const lX = [], lY = [], rX = [], rY = [];
    for (let i = 0; i < X.length; i++) {
      if (X[i][feat] <= thresh) { lX.push(X[i]); lY.push(y[i]); }
      else { rX.push(X[i]); rY.push(y[i]); }
    }
    return { leaf: false, feat, thresh,
      left:  this._build(lX, lY, depth + 1),
      right: this._build(rX, rY, depth + 1) };
  }

  fit(X, y)       { this.root = this._build(X, y, 0); return this; }
  predictOne(x)   { let n = this.root; while (!n.leaf) n = x[n.feat] <= n.thresh ? n.left : n.right; return n.value; }
  predict(X)      { return X.map(x => this.predictOne(x)); }
}

// ── GRADIENT BOOSTING ─────────────────────────────────────────────────────────
class GradientBoostingRegressor {
  constructor({ nEstimators=80, maxDepth=4, learningRate=0.1, subsample=0.8, seed=42 }={}) {
    this.nEstimators  = nEstimators;
    this.maxDepth     = maxDepth;
    this.learningRate = learningRate;
    this.subsample    = subsample;
    this.seed         = seed;
    this.trees        = [];
    this.initialPred  = 0;
    this.featureImportances = null;
  }

  _subsample(n, rng) {
    const size = Math.floor(n * this.subsample);
    const idx  = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, size);
  }

  _collectImp(node, acc) {
    if (!node || node.leaf) return;
    acc[node.feat] = (acc[node.feat] || 0) + 1;
    this._collectImp(node.left, acc);
    this._collectImp(node.right, acc);
  }

  fit(X, y) {
    const rng    = seededRng(this.seed);
    const n      = X.length;
    const nFeats = X[0].length;
    this.initialPred = y.reduce((a, b) => a + b, 0) / n;
    let residuals = y.map(yi => yi - this.initialPred);
    const impAcc  = new Array(nFeats).fill(0);

    for (let t = 0; t < this.nEstimators; t++) {
      const idx   = this._subsample(n, rng);
      const Xsub  = idx.map(i => X[i]);
      const rsub  = idx.map(i => residuals[i]);
      const tree  = new DecisionTree(this.maxDepth, 5).fit(Xsub, rsub);
      this.trees.push(tree);
      const preds = tree.predict(X);
      residuals   = residuals.map((r, i) => r - this.learningRate * preds[i]);
      this._collectImp(tree.root, impAcc);
    }

    const total = impAcc.reduce((a, b) => a + b, 0) || 1;
    this.featureImportances = impAcc.map(v => v / total);
    return this;
  }

  predictOne(x) {
    let pred = this.initialPred;
    for (const tree of this.trees) pred += this.learningRate * tree.predictOne(x);
    return Math.min(1, Math.max(0, pred));
  }

  predict(X) { return X.map(x => this.predictOne(x)); }
}

// ── TRAIN / TEST SPLIT ────────────────────────────────────────────────────────
function trainTestSplit(X, y, testSize=0.2, seed=99) {
  const rng = seededRng(seed);
  const idx = Array.from({ length: X.length }, (_, i) => i).sort(() => rng() - 0.5);
  const cut = Math.floor(X.length * (1 - testSize));
  return {
    Xtrain: idx.slice(0, cut).map(i => X[i]),
    ytrain: idx.slice(0, cut).map(i => y[i]),
    Xtest:  idx.slice(cut).map(i => X[i]),
    ytest:  idx.slice(cut).map(i => y[i]),
  };
}

// ── EVALUATION ────────────────────────────────────────────────────────────────
function evaluate(yTrue, yPred) {
  const n = yTrue.length;
  let sumAE = 0, sumSE = 0;
  for (let i = 0; i < n; i++) {
    const e = Math.abs(yTrue[i] - yPred[i]) * 100;
    sumAE += e; sumSE += e * e;
  }
  const mean = yTrue.reduce((a, b) => a + b, 0) / n;
  let bSumAE = 0;
  for (const v of yTrue) bSumAE += Math.abs(v - mean) * 100;
  return {
    mae:         sumAE / n,
    rmse:        Math.sqrt(sumSE / n),
    baselineMAE: bSumAE / n,
    improvement: ((bSumAE - sumAE) / bSumAE) * 100,
    n,
  };
}

// ── SINGLETON ─────────────────────────────────────────────────────────────────
let _model      = null;
let _modelStats = null;
let _trained    = false;

function ensureTrained() {
  if (_trained) return;
  console.time('[Wanderly ML] Training');

  const { X, y }                        = generateTrainingData(800, 42);
  const { Xtrain, ytrain, Xtest, ytest } = trainTestSplit(X, y, 0.2, 99);

  _model = new GradientBoostingRegressor({
    nEstimators: 80, maxDepth: 4, learningRate: 0.1, subsample: 0.8, seed: 42,
  });
  _model.fit(Xtrain, ytrain);

  const testPreds = _model.predict(Xtest);
  const metrics   = evaluate(ytest, testPreds);

  const featureImportance = FEATURE_NAMES
    .map((name, i) => ({ name, importance: _model.featureImportances[i] }))
    .sort((a, b) => b.importance - a.importance);

  _modelStats = {
    mae:              metrics.mae,
    rmse:             metrics.rmse,
    baselineMAE:      metrics.baselineMAE,
    improvement:      metrics.improvement,
    nTrain:           Xtrain.length,
    nTest:            Xtest.length,
    featureImportance,
    nEstimators:      80,
    maxDepth:         4,
    learningRate:     0.1,
    subsample:        0.8,
    predicts:         'budget_fit score (0-100)',
  };

  _trained = true;
  console.timeEnd('[Wanderly ML] Training');
  console.log(
    `[Wanderly ML] Predicts: budget_fit | MAE: ${metrics.mae.toFixed(2)} pts` +
    ` | RMSE: ${metrics.rmse.toFixed(2)} pts` +
    ` | Baseline: ${metrics.baselineMAE.toFixed(2)} pts` +
    ` | Improvement: ${metrics.improvement.toFixed(1)}%`
  );
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Returns model evaluation stats.
 * Trains on first call if not already done.
 */
export function getMLModelStats() {
  ensureTrained();
  return _modelStats;
}

/**
 * Predicts the budget_fit score (0-100) for a single destination
 * using the trained ML model.
 *
 * This is the ML-predicted value shown on the Budget score bar
 * in TripCard when ML mode is active.
 */
export function predictBudgetFit(dest, preferences) {
  ensureTrained();
  const features = extractFeatures(dest, preferences);
  return Math.round(_model.predictOne(features) * 100);
}

/**
 * Ranks destinations using ML-predicted budget_fit scores.
 * Same interface as rankDestinations() from scoring.js.
 *
 * KEY DIFFERENCE from rule-based:
 * - scores.budget_fit = ML model prediction (not formula)
 * - scores.overall    = recalculated using ML budget_fit
 * - scores.season, match, feasibility = unchanged from scoring.js
 *
 * This means the Budget bar on every TripCard shows the ML number
 * when in ML mode — directly visible and testable.
 */
export function mlRankDestinations(preferences, topN = 6) {
  ensureTrained();

  const budget      = preferences.budget || 1000;
  const numTravelers = preferences.num_travelers || 1;
  const perPerson   = budget / Math.max(numTravelers, 1);
  const budgetStyle = preferences?.budget_style || 'flexible';

  // Same pool filtering as scoring.js
  let pool = [...DESTINATIONS];
  if (perPerson < 500) {
    pool = pool.filter(d =>
      d.region?.includes('Domestic') ||
      d.region === 'Central America' ||
      d.region === 'Caribbean' ||
      (d.daily_cost || 999) < 40
    );
  }

  // Reduced jitter ±5 (not ±10) so budget filter isn't overridden by randomness
  const jitter = () => Math.floor(Math.random() * 10) - 5;

  const allResults = pool.map(dest => {
    const scored      = scoreDestination(dest, preferences);
    const mlBudgetFit = predictBudgetFit(dest, preferences);

    // overall: ML budget_fit heaviest at 50%, matches scoring.js weights
    const mlOverall = Math.round(
      mlBudgetFit               * 0.50 +
      scored.scores.season      * 0.15 +
      scored.scores.match       * 0.20 +
      scored.scores.feasibility * 0.10 +
      jitter()
    );

    return {
      ...scored,
      scores: {
        ...scored.scores,
        budget_fit: mlBudgetFit,
        overall:    Math.min(100, Math.max(0, mlOverall)),
      },
      ml_score:          mlBudgetFit,
      rule_based_budget: scored.scores.budget_fit,
      blended_score:     Math.min(100, Math.max(0, mlOverall)),
    };
  });

  // ── BUDGET FILTER — mirrors scoring.js rankDestinations exactly ────────────
  // costs.budget = correct TOTAL for all travelers (set by scoreDestination)
  // budget       = user's TOTAL budget for all travelers
  const filterBy = (mult) => allResults.filter(s => s.costs.budget <= budget * mult);

  let scored;
  let budgetWarning = null;

  if (budgetStyle === 'show_everything') {
    scored = allResults;

  } else if (budgetStyle === 'strict') {
    scored = filterBy(1.0);
    if (scored.length < 3) scored = filterBy(1.05);
    if (scored.length < 3) scored = filterBy(1.10);
    if (scored.length === 0) {
      scored = [...allResults].sort((a, b) => a.costs.budget - b.costs.budget);
      budgetWarning = 'strict_no_results';
    }

  } else {
    // flexible: up to 10% over budget
    scored = filterBy(1.10);
    if (scored.length < 3) scored = filterBy(1.20);
    if (scored.length === 0) {
      scored = [...allResults].sort((a, b) => a.costs.budget - b.costs.budget);
      budgetWarning = 'flexible_no_results';
    }
  }

  scored.sort((a, b) => b.blended_score - a.blended_score);
  const results = scored.slice(0, topN);

  // Tag each result with budget_warning for Results.jsx disclaimer
  if (budgetWarning) {
    results.forEach(r => { r.budget_warning = budgetWarning; });
  } else {
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