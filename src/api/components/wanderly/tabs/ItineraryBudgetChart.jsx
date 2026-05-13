import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign } from "lucide-react";

export default function ItineraryBudgetChart({ itineraryContent, flightBudget, accomBudget, budget, numTravelers = 1 }) {
  const itinDays = itineraryContent?.itinerary || [];
  const itinSpentPerPerson = itinDays.length > 0
    ? itinDays[itinDays.length - 1]?.running_total || itinDays.reduce((s, d) => s + (d.daily_spend_estimate || 0), 0)
    : 0;
  const itinSpent = itinSpentPerPerson * numTravelers;

  const total = flightBudget + accomBudget + itinSpent;
  const remaining = Math.max(0, budget - total);
  const percentUsed = budget > 0 ? (total / budget) * 100 : 0;

  const data = [
    ...(flightBudget > 0 ? [{ name: "Flights", value: flightBudget, color: "#3b82f6" }] : []),
    ...(accomBudget > 0 ? [{ name: "Hotel", value: accomBudget, color: "#f59e0b" }] : []),
    ...(itinSpent > 0 ? [{ name: "Activities", value: itinSpent, color: "#10b981" }] : []),
    ...(remaining > 0 ? [{ name: "Remaining", value: remaining, color: "#e5e7eb" }] : []),
  ];

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="font-playfair text-xl font-semibold">Budget Breakdown</h3>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
              contentStyle={{ fontFamily: "var(--font-inter)", fontSize: 12, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="w-full md:w-auto space-y-2 min-w-[180px]">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-inter text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-sm font-inter font-semibold">${entry.value.toLocaleString()}</span>
            </div>
          ))}
          <div className="pt-2 border-t mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-inter font-semibold">Total</span>
              <span className="text-sm font-inter font-bold">${total.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground font-inter mt-1">{percentUsed.toFixed(0)}% of ${budget.toLocaleString()} budget</div>
          </div>
        </div>
      </div>
    </div>
  );
}