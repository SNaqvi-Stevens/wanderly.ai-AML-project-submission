import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Plus, Trash2, TrendingUp, Camera, Loader2, CheckCircle2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CATEGORIES = ["Flights", "Accommodation", "Food", "Activities", "Transport", "Shopping", "Other"];

const CAT_COLORS = {
  Flights: "bg-blue-50 text-blue-700",
  Accommodation: "bg-emerald-50 text-emerald-700",
  Food: "bg-amber-50 text-amber-700",
  Activities: "bg-purple-50 text-purple-700",
  Transport: "bg-cyan-50 text-cyan-700",
  Shopping: "bg-pink-50 text-pink-700",
  Other: "bg-slate-100 text-slate-600",
};

export default function BudgetTracker({ trip, onTripUpdate }) {
  const [spending, setSpending] = useState(trip?.spending || []);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ category: "Food", amount: "", description: "", date: new Date().toISOString().split('T')[0] });
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const receiptInputRef = useRef(null);

  const totalSpent = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const budget = trip?.user_budget_cap || trip?.total_cost_budget || 1000;
  const remaining = budget - totalSpent;
  const percentUsed = Math.min(100, (totalSpent / budget) * 100);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setScanningReceipt(true);
    setShowForm(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setReceiptPreview(file_url);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing a receipt image. Extract the following information from this receipt:
1. Total amount (the final amount paid, including tax/tip if shown)
2. Category (one of: Flights, Accommodation, Food, Activities, Transport, Shopping, Other)
3. A short description (merchant name or what was purchased, max 40 chars)
4. Date (in YYYY-MM-DD format, if visible)

Return ONLY valid JSON. If you cannot determine a value, use null.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          amount: { type: "number" },
          category: { type: "string" },
          description: { type: "string" },
          date: { type: "string" }
        }
      }
    });

    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    setFormData({
      category: parsed.category && CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      amount: parsed.amount ? parsed.amount.toString() : "",
      description: parsed.description || "",
      date: parsed.date || new Date().toISOString().split('T')[0],
    });
    setScanningReceipt(false);
  };

  const addSpending = async () => {
    if (!formData.amount || isNaN(formData.amount)) return;
    const newEntry = {
      id: Date.now().toString(),
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      receipt_url: receiptPreview || null,
    };
    const updated = [...spending, newEntry];
    setSpending(updated);
    if (trip?.id) await base44.entities.Trip.update(trip.id, { spending: updated });
    if (onTripUpdate) onTripUpdate({ ...trip, spending: updated });
    setFormData({ category: "Food", amount: "", description: "", date: new Date().toISOString().split('T')[0] });
    setReceiptPreview(null);
    setShowForm(false);
  };

  const removeSpending = async (id) => {
    const updated = spending.filter(s => s.id !== id);
    setSpending(updated);
    if (trip?.id) await base44.entities.Trip.update(trip.id, { spending: updated });
    if (onTripUpdate) onTripUpdate({ ...trip, spending: updated });
  };

  return (
    <div className="space-y-4">
      {/* Budget Overview */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h4 className="font-inter font-semibold">Budget Tracker</h4>
          </div>
          <span className="text-xs font-inter text-muted-foreground">{Math.round(percentUsed)}% used</span>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${remaining >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-muted-foreground font-inter mb-0.5">Budget</div>
            <div className="text-lg font-inter font-bold">${budget.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-inter mb-0.5">Spent</div>
            <div className="text-lg font-inter font-bold">${totalSpent.toLocaleString()}</div>
          </div>
          <div>
            <div className={`text-xs font-inter mb-0.5 ${remaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {remaining >= 0 ? 'Remaining' : 'Over Budget'}
            </div>
            <div className={`text-lg font-inter font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ${Math.abs(remaining).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Add entry form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-2xl p-4 border overflow-hidden"
          >
            {scanningReceipt ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm font-inter text-muted-foreground">Reading your receipt with AI...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Receipt preview */}
                {receiptPreview && (
                  <div className="relative">
                    <img src={receiptPreview} alt="Receipt" className="w-full max-h-40 object-contain rounded-xl border bg-secondary/20" />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs text-emerald-600 font-inter mt-1 text-center">✓ Receipt scanned — review & confirm below</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="px-3 py-2 rounded-xl border bg-background text-sm font-inter"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <Input
                    type="number"
                    placeholder="Amount ($)"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="rounded-xl text-sm"
                  />
                </div>
                <Input
                  type="text"
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl text-sm"
                />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="rounded-xl text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addSpending} className="rounded-xl flex-1">Add Spending</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setReceiptPreview(null); }} className="rounded-xl">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!showForm && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="flex-1 rounded-xl font-inter gap-2"
          >
            <Plus className="w-4 h-4" /> Log Manually
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => receiptInputRef.current?.click()}
            className="flex-1 rounded-xl font-inter gap-2 border-primary/40 text-primary hover:bg-primary/5"
          >
            <Camera className="w-4 h-4" /> Scan Receipt
          </Button>
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleReceiptUpload}
          />
        </div>
      )}

      {/* Spending list */}
      {spending.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-inter font-semibold text-muted-foreground">Transactions</h4>
          {spending.slice().reverse().map((entry) => (
            <div key={entry.id} className="bg-card rounded-xl p-3 flex items-center gap-3 border">
              {entry.receipt_url && (
                <a href={entry.receipt_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <img src={entry.receipt_url} alt="receipt" className="w-10 h-10 rounded-lg object-cover border" />
                </a>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-inter font-semibold px-2 py-0.5 rounded-lg ${CAT_COLORS[entry.category] || CAT_COLORS.Other}`}>{entry.category}</span>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                {entry.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-inter font-bold">${entry.amount.toFixed(2)}</span>
                <button onClick={() => removeSpending(entry.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}