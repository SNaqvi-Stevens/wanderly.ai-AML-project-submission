import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sun, CloudRain, Thermometer, Wind, Shirt, Star, Brain } from "lucide-react";
import ScoreBadge from "../ScoreBadge";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function OverviewTab({ trip, content, preferences, destination, isStudentMode }) {
  const weather = content?.weather || {};

  const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const chartData = (() => {
    const mw = content?.monthly_weather;
    if (!mw || Object.keys(mw).length === 0) return null;
    return MONTH_LABELS.map((short, i) => {
      // Try short name first ("Jan"), then full name ("January")
      const d = mw[short] || mw[MONTH_FULL[i]] || {};
      return {
        month: short,
        high: d.high_f ?? null,
        low: d.low_f ?? null,
        rain: d.rain_days ?? null,
      };
    });
  })();

  if (!content?.overview) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
        <Star className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-xl font-semibold mb-2">Explore {destination?.name || trip?.destination_name}</h3>
        <p className="text-sm text-muted-foreground font-inter">Trip details are still loading. Explore the other tabs to start planning!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Editorial Description */}
      <div className="bg-card rounded-2xl p-8 shadow-sm">
        <p className="font-playfair text-lg leading-relaxed italic text-foreground/90">
          {content?.overview || "An incredible destination awaiting your discovery."}
        </p>
      </div>

      {/* Why This Trip */}
      {content?.why_this_trip && (
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" /> Why This Trip Is Right For You
          </h3>
          <p className="text-foreground/80 font-inter leading-relaxed">{content.why_this_trip}</p>
        </div>
      )}

      {/* Season Analysis */}
      <div className="bg-card rounded-2xl p-8 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-primary" /> Season Analysis
        </h3>
        <p className="text-muted-foreground font-inter leading-relaxed">{content?.season_analysis}</p>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm text-center">
          <ScoreBadge label="Season" value={trip.scores?.season} color="primary" />
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm text-center relative">
          <ScoreBadge label="Budget Fit" value={trip.scores?.budget_fit} color="emerald" />
          {trip.ml_score != null && (
            <span className="absolute top-2 right-2 flex items-center gap-0.5 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-md font-inter font-semibold">
              <Brain className="w-2.5 h-2.5" /> ML
            </span>
          )}
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm text-center">
          <ScoreBadge label="Match" value={trip.scores?.match} color="coral" />
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm text-center">
          <ScoreBadge label="Feasibility" value={trip.scores?.feasibility} color="aqua" />
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm text-center">
          <ScoreBadge label="Safety" value={content?.safety_score} color="emerald" />
        </div>
      </div>

      {/* Preference Matches */}
      {trip.preference_matches?.length > 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-4">Your Interest Matches</h3>
          <div className="flex flex-wrap gap-2">
            {trip.preference_matches.map(m => (
              <Badge key={m} className="bg-primary/10 text-primary border-primary/20 rounded-lg px-3 py-1 font-inter">
                {m.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Weather Summary */}
      <div className="bg-card rounded-2xl p-8 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-6">Weather Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {weather.high_f && (
            <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-4">
              <Thermometer className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-xs text-muted-foreground font-inter">High</div>
                <div className="font-inter font-semibold">{weather.high_f}°F</div>
              </div>
            </div>
          )}
          {weather.low_f && (
            <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-4">
              <Thermometer className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-xs text-muted-foreground font-inter">Low</div>
                <div className="font-inter font-semibold">{weather.low_f}°F</div>
              </div>
            </div>
          )}
          {weather.rain_days !== undefined && (
            <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-4">
              <CloudRain className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-muted-foreground font-inter">Rain Days</div>
                <div className="font-inter font-semibold">{weather.rain_days}/month</div>
              </div>
            </div>
          )}
          {weather.humidity && (
            <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-4">
              <Wind className="w-5 h-5 text-teal-500" />
              <div>
                <div className="text-xs text-muted-foreground font-inter">Humidity</div>
                <div className="font-inter font-semibold">{weather.humidity}</div>
              </div>
            </div>
          )}
        </div>
        {weather.packing?.length > 0 && (
          <div className="mt-6">
            <h4 className="font-inter font-semibold text-sm mb-3 flex items-center gap-2"><Shirt className="w-4 h-4" /> Packing Tips</h4>
            <div className="flex flex-wrap gap-2">
              {weather.packing.map((item, i) => (
                <span key={i} className="px-3 py-1.5 bg-secondary/50 rounded-lg text-sm font-inter">{item}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Weather Chart */}
      {chartData && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-1">Weather by Month</h3>
          <p className="text-sm text-muted-foreground font-inter mb-6">
            Avg high/low temps (°F) and rainy days per month
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "var(--font-inter)" }} />
              <YAxis yAxisId="temp" tick={{ fontSize: 11, fontFamily: "var(--font-inter)" }} unit="°" domain={["auto", "auto"]} />
              <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 11, fontFamily: "var(--font-inter)" }} unit="d" domain={[0, "dataMax + 2"]} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "High Temp") return [`${value}°F`, "High Temp"];
                  if (name === "Low Temp") return [`${value}°F`, "Low Temp"];
                  if (name === "Rain Days") return [`${value} days`, "Rain Days"];
                  return [value, name];
                }}
                contentStyle={{ fontFamily: "var(--font-inter)", fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontFamily: "var(--font-inter)", fontSize: 12 }} />
              <Line yAxisId="temp" type="monotone" dataKey="high" name="High Temp" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line yAxisId="temp" type="monotone" dataKey="low" name="Low Temp" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line yAxisId="rain" type="monotone" dataKey="rain" name="Rain Days" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Seasonal Weather */}
      {content?.season_weather && Object.keys(content.season_weather).length > 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-6">Weather by Season</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(content.season_weather).map(([season, data]) => (
              <div key={season} className="bg-secondary/50 rounded-xl p-5">
                <h4 className="font-inter font-semibold mb-1">{season}</h4>
                {data.months?.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">{data.months.join(", ")}</p>
                )}
                <div className="space-y-2 text-sm font-inter">
                  {data.high_f && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">High</span>
                      <span className="font-semibold">{data.high_f}°F</span>
                    </div>
                  )}
                  {data.low_f && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Low</span>
                      <span className="font-semibold">{data.low_f}°F</span>
                    </div>
                  )}
                  {data.humidity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Humidity</span>
                      <span className="font-semibold">{data.humidity}</span>
                    </div>
                  )}
                  {data.description && (
                    <p className="text-xs text-muted-foreground mt-3 italic">{data.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Mode Tips */}
      {isStudentMode && content?.student_tips?.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
          <h3 className="font-playfair text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" /> Student & Budget Tips
          </h3>
          <ul className="space-y-2">
            {content.student_tips.map((tip, i) => (
              <li key={i} className="text-sm font-inter text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}