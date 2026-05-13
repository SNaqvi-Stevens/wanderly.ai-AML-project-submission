import React from "react";
import { ExternalLink, DollarSign, MapPin, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MoneyTab({ trip, content }) {
  const money = content?.money || {};
  const destName = trip?.destination_name || '';
  const country = trip?.country || '';

  const wiseUrl = `https://wise.com/gb/currency-converter/usd-to-${(money.currency_code || '').toLowerCase()}-rate`;
  const xeUrl = `https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=${money.currency_code || ''}`;
  const googleMapsAtmUrl = `https://www.google.com/maps/search/ATM+or+currency+exchange+in+${encodeURIComponent(destName)}`;

  if (!money.currency_name) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
        <DollarSign className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-xl font-semibold mb-2">Money & Currency</h3>
        <p className="text-sm text-muted-foreground font-inter">Currency info is loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Overview */}
      <div className="bg-card rounded-2xl p-8 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-6">Currency Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="text-xs text-muted-foreground font-inter mb-1">Local Currency</div>
            <div className="font-inter font-bold text-lg">{money.currency_name}</div>
            <div className="text-sm text-muted-foreground font-inter">{money.currency_code} ({money.currency_symbol})</div>
          </div>
          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="text-xs text-muted-foreground font-inter mb-1">Approx. Rate</div>
            <div className="font-inter font-bold text-lg">1 USD ≈ {money.approx_rate_to_usd}</div>
            <div className="text-xs text-amber-600 font-inter mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> AI estimate — verify live rate below
            </div>
          </div>
          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="text-xs text-muted-foreground font-inter mb-1">Cash vs Card</div>
            <div className="font-inter font-semibold text-sm">{money.cash_vs_card_recommendation}</div>
          </div>
        </div>

        {/* Live Rate Links */}
        <div className="mt-6">
          <p className="text-sm font-inter font-semibold mb-3">Live Exchange Rates</p>
          <div className="flex flex-wrap gap-3">
            <a href={xeUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> XE.com</Button>
            </a>
            <a href={wiseUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Wise</Button>
            </a>
            <a href={`https://www.google.com/search?q=1+USD+to+${money.currency_code}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Google</Button>
            </a>
            <a href={`https://www.revolut.com/currency-exchange/${money.currency_code?.toLowerCase() || ''}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Revolut</Button>
            </a>
          </div>
          {money.currency_code && (
            <div className="mt-4">
              <a
                href={`https://www.google.com/finance/quote/USD-${money.currency_code}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 text-sm font-inter font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View live USD → {money.currency_code} rate on Google Finance
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick Reference */}
      {money.quick_reference?.length > 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-4">Quick Price Reference</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {money.quick_reference.map((item, i) => (
              <div key={i} className="bg-secondary/50 rounded-xl p-3">
                <div className="text-xs text-muted-foreground font-inter">{item.item}</div>
                <div className="font-inter font-semibold mt-1">{item.local_price}</div>
                <div className="text-xs text-primary font-inter">≈ {item.usd_equivalent}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Where to Exchange */}
      <div className="bg-card rounded-2xl p-8 shadow-sm">
        <h3 className="font-playfair text-xl font-semibold mb-4">Where to Get Local Currency</h3>
        <div className="space-y-4">
          {(money.exchange_options || []).map((opt, i) => {
            const mapsQuery = `${opt.method} in ${destName} ${country}`;
            const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(mapsQuery)}`;
            return (
              <div key={i} className="flex items-start gap-4 p-4 bg-secondary/40 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-inter font-semibold text-sm">{opt.method}</span>
                    {opt.recommended && <Badge className="bg-primary/10 text-primary text-xs rounded-lg border-0">Recommended</Badge>}
                    {opt.avoid && <Badge className="bg-red-50 text-red-600 text-xs rounded-lg border-0">Avoid</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground font-inter">{opt.description}</p>
                  {opt.fee_estimate && <p className="text-xs text-muted-foreground font-inter mt-1">Fee: {opt.fee_estimate}</p>}
                  {!opt.avoid && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-inter hover:underline">
                      <MapPin className="w-3 h-3" /> Find on map
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <a href={googleMapsAtmUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl text-xs"><MapPin className="w-3 h-3 mr-1.5" /> Find ATMs & Exchange Near Me</Button>
          </a>
        </div>
      </div>

      {/* Tipping */}
      {money.tipping_guide && (
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <h3 className="font-playfair text-xl font-semibold mb-4">Tipping Guide</h3>
          <div className="space-y-3">
            {Object.entries(money.tipping_guide).map(([context, tip]) => (
              <div key={context} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <span className="text-sm font-inter capitalize">{context.replace(/_/g, ' ')}</span>
                <span className="text-sm font-inter font-semibold text-primary">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {money.warnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h4 className="font-inter font-semibold text-amber-800">Money Tips & Warnings</h4>
          </div>
          <ul className="space-y-2">
            {money.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-800 font-inter flex items-start gap-2">
                <span>•</span> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cards */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-5 h-5 text-primary" />
          <h4 className="font-inter font-semibold">Best Cards to Use Abroad</h4>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground font-inter">
          <li>• <strong>Wise / Revolut</strong> — no foreign transaction fees, great exchange rates</li>
          <li>• <strong>Charles Schwab debit</strong> — refunds all ATM fees worldwide</li>
          <li>• <strong>Chase Sapphire / Capital One Venture</strong> — no foreign transaction fees on credit</li>
          <li>• Notify your bank before traveling to avoid card freezes</li>
        </ul>
      </div>
    </div>
  );
}