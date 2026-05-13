import jsPDF from "jspdf";

const PRIMARY = [23, 160, 142]; // teal
const DARK = [30, 45, 45];
const MUTED = [120, 130, 130];
const LIGHT_BG = [245, 248, 247];
const WHITE = [255, 255, 255];

function addPageHeader(doc, trip, pageNum) {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 12, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`✦ Wanderly — ${trip?.destination_name || "Trip Plan"}`, 14, 8);
  doc.text(`Page ${pageNum}`, 196, 8, { align: "right" });
  doc.setTextColor(...DARK);
}

function checkPageBreak(doc, y, needed = 20, trip, pageCount) {
  if (y + needed > 278) {
    doc.addPage();
    pageCount.val += 1;
    addPageHeader(doc, trip, pageCount.val);
    return 22;
  }
  return y;
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(10, y, 190, 9, 2, 2, "F");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(text, 14, y + 6.2);
  doc.setTextColor(...DARK);
  return y + 14;
}

function labelValue(doc, label, value, x, y, labelWidth = 40) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  doc.text(String(value || "—"), x + labelWidth, y);
  return y + 5.5;
}

export function generateTripPDF({ trip, itinerary, budgetContent, packingContent, preferences }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageCount = { val: 1 };
  const destName = trip?.destination_name || "Your Trip";

  // ─── COVER PAGE ────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 80, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("✦  WANDERLY TRAVEL PLAN", 105, 30, { align: "center" });

  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text(destName, 105, 50, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${trip?.country || ""} · ${trip?.trip_length_days || (itinerary?.length || 0)} days`, 105, 62, { align: "center" });

  // Trip summary box
  doc.setFillColor(...WHITE);
  doc.roundedRect(14, 88, 182, 50, 3, 3, "F");
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 88, 182, 50, 3, 3, "S");

  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Trip Summary", 20, 98);

  const budget = trip?.user_budget_cap || trip?.total_cost_budget || preferences?.budget || 0;
  const numTravelers = preferences?.num_travelers || 1;
  const tripDays = trip?.trip_length_days || itinerary?.length || (preferences?.max_days || 5);
  const departureDates = preferences?.start_date && preferences?.end_date
    ? `${preferences.start_date} → ${preferences.end_date}`
    : preferences?.preferred_months?.join(", ") || "Flexible";

  labelValue(doc, "Destination", `${destName}, ${trip?.country || ""}`, 20, 108, 45);
  labelValue(doc, "Duration", `${tripDays} days`, 20, 114, 45);
  labelValue(doc, "Travelers", `${numTravelers} traveler(s) · ${preferences?.traveler_type || ""}`, 20, 120, 45);
  labelValue(doc, "Budget", `$${budget.toLocaleString()} total`, 110, 108, 35);
  labelValue(doc, "Dates", departureDates, 110, 114, 35);
  labelValue(doc, "Generated", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 110, 120, 35);

  // ─── PAGE 2 — ITINERARY ────────────────────────────────────────────────────
  doc.addPage();
  pageCount.val += 1;
  addPageHeader(doc, trip, pageCount.val);

  let y = 22;
  y = sectionTitle(doc, "📅  Day-by-Day Itinerary", y);

  const days = itinerary || [];
  if (days.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No itinerary data available.", 14, y);
    y += 8;
  }

  for (const day of days) {
    y = checkPageBreak(doc, y, 40, trip, pageCount);

    // Day header
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(10, y, 190, 8, 2, 2, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Day ${day.day_number}  —  ${day.thematic_title || ""}`, 14, y + 5.5);
    doc.setTextColor(...DARK);
    y += 11;

    const slots = [
      { label: "🌅 Morning", data: day.morning, field: "activity" },
      { label: "☀️ Afternoon", data: day.afternoon, field: "activity" },
      { label: "🌙 Evening", data: day.evening, field: "dinner_spot" },
    ];

    for (const slot of slots) {
      if (!slot.data) continue;
      const activity = slot.data[slot.field] || slot.data.activity || "";
      const cost = slot.data.estimated_cost;
      if (!activity) continue;

      y = checkPageBreak(doc, y, 10, trip, pageCount);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED);
      doc.text(slot.label, 14, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      const lines = doc.splitTextToSize(`${activity}${cost ? `  ($${cost})` : ""}`, 150);
      doc.text(lines, 50, y);
      y += lines.length * 4.5 + 1;
    }

    if (day.daily_spend_estimate) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      doc.text(`Estimated daily spend: $${day.daily_spend_estimate}`, 14, y);
      y += 5;
    }

    y += 3;
    doc.setDrawColor(220, 228, 226);
    doc.setLineWidth(0.3);
    doc.line(10, y, 200, y);
    y += 4;
  }

  // ─── BUDGET BREAKDOWN ─────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 60, trip, pageCount);
  y = sectionTitle(doc, "💰  Budget Breakdown", y);

  const bd = budgetContent?.budget_breakdown || {};
  const budgetRows = [
    ["Flights", bd.flights_total],
    ["Accommodation", bd.accommodation_total],
    ["Food & Dining", bd.food_total],
    ["Activities & Excursions", bd.excursions_total],
    ["Local Transport", bd.transport_total],
    ["Buffer / Misc", bd.buffer_amount],
  ].filter(([, v]) => v != null);

  const grandBudget = bd.grand_total_budget_version;
  const grandComfy = bd.grand_total_comfortable_version;
  const grandSplurge = bd.grand_total_splurge_version;

  if (budgetRows.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No budget data available.", 14, y);
    y += 8;
  } else {
    // Header row
    doc.setFillColor(220, 240, 235);
    doc.rect(10, y, 190, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Category", 14, y + 5);
    doc.text("Estimated Cost", 170, y + 5, { align: "right" });
    y += 9;

    for (const [label, value] of budgetRows) {
      y = checkPageBreak(doc, y, 7, trip, pageCount);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(label, 14, y);
      doc.text(`$${(value || 0).toLocaleString()}`, 170, y, { align: "right" });
      doc.setDrawColor(230, 235, 233);
      doc.setLineWidth(0.2);
      doc.line(10, y + 2, 200, y + 2);
      y += 7;
    }

    if (grandBudget || grandComfy) {
      y += 2;
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(10, y, 190, 8, 2, 2, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const totals = [
        grandBudget && `Budget: $${grandBudget.toLocaleString()}`,
        grandComfy && `Comfortable: $${grandComfy.toLocaleString()}`,
        grandSplurge && `Splurge: $${grandSplurge.toLocaleString()}`,
      ].filter(Boolean).join("    ");
      doc.text(`Total Estimates   ${totals}`, 14, y + 5.5);
      doc.setTextColor(...DARK);
      y += 13;
    }

    if (bd.lower_cost_strategies?.length > 0) {
      y = checkPageBreak(doc, y, 20, trip, pageCount);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text("💡 Money-Saving Tips", 14, y);
      y += 5;
      for (const tip of bd.lower_cost_strategies.slice(0, 5)) {
        y = checkPageBreak(doc, y, 8, trip, pageCount);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        const lines = doc.splitTextToSize(`• ${tip}`, 180);
        doc.text(lines, 14, y);
        y += lines.length * 4.5 + 1;
      }
      y += 4;
    }
  }

  // ─── PACKING LIST ─────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 60, trip, pageCount);
  y = sectionTitle(doc, "🧳  Packing List", y);

  const packing = packingContent?.packing_tips || {};
  const packingCategories = [
    { key: "clothing", label: "Clothing" },
    { key: "essentials", label: "Essentials" },
    { key: "tech", label: "Tech & Docs" },
    { key: "health", label: "Health & Safety" },
  ];

  let anyPacking = false;
  for (const cat of packingCategories) {
    const items = packing[cat.key] || [];
    if (!items.length) continue;
    anyPacking = true;

    y = checkPageBreak(doc, y, 15, trip, pageCount);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(cat.label, 14, y);
    y += 4.5;

    for (const item of items) {
      y = checkPageBreak(doc, y, 6, trip, pageCount);
      const label = typeof item === "string" ? item : item.item;
      const note = typeof item === "object" && item.note ? ` — ${item.note}` : "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const lines = doc.splitTextToSize(`✓  ${label}${note}`, 180);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 0.5;
    }
    y += 3;
  }

  if (packing.dress_code_notes) {
    y = checkPageBreak(doc, y, 15, trip, pageCount);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Dress Code & Cultural Notes", 14, y);
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(packing.dress_code_notes, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 4;
  }

  if (!anyPacking) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No packing data available.", 14, y);
    y += 8;
  }

  // ─── FOOTER ON LAST PAGE ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("Generated by Wanderly · wanderly.app · Have an amazing trip! ✈️", 105, 290, { align: "center" });
  }

  doc.save(`Wanderly_${destName.replace(/\s+/g, "_")}_TripPlan.pdf`);
}