import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Leaf, UtensilsCrossed } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { googleMapsUrl, viatorUrl } from "@/lib/bookingLinks";

export default function FoodTab({ trip, content, preferences, destination }) {
  const [sortBy, setSortBy] = React.useState('price');
  const [filterCategories, setFilterCategories] = React.useState([]);
  
  const restaurants = content?.restaurants || [];
  const destName = trip?.destination_name || destination?.name || '';
  const d = destination || {};
  const isHalal = preferences?.dietary?.includes('Halal') || preferences?.dietary?.includes('halal');
  
  const filtered = restaurants
    .filter(r => filterCategories.length === 0 || filterCategories.includes(r.category))
    .sort((a, b) => {
      if (sortBy === 'price') return (a.price_per_person || 0) - (b.price_per_person || 0);
      return 0;
    });

  const streetFood = restaurants.filter(r => r.category === 'street_food' || r.category === 'street_food_market');
  const casual = restaurants.filter(r => r.category === 'casual' || r.category === 'casual_local');
  const special = restaurants.filter(r => r.category === 'special' || r.category === 'mid_dining' || r.category === 'upscale_special' || r.category === 'food_tour_cooking_class');

  // Filter halal if needed (support both old and new field names)
  const filterHalal = (items) => isHalal ? items.filter(r => r.halal !== false && r.halal_certified !== false && r.halal_friendly !== false) : items;

  // Derive daily cost estimates from restaurant data
  const streetAvg = streetFood.length ? Math.round(streetFood.reduce((s, r) => s + (r.price_per_person || 0), 0) / streetFood.length) : 8;
  const casualAvg = casual.length ? Math.round(casual.reduce((s, r) => s + (r.price_per_person || 0), 0) / casual.length) : 18;
  const splurgeAvg = special.length ? Math.round(special.reduce((s, r) => s + (r.price_per_person || 0), 0) / special.length) : 55;

  if (restaurants.length === 0 && filtered.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
        <UtensilsCrossed className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-playfair text-lg font-semibold mb-1">Find Restaurants</h3>
        <p className="text-sm text-muted-foreground font-inter mb-5">Discover places to eat in {destName}:</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href={googleMapsUrl(`restaurants in ${destName}`)} target="_blank" rel="noopener noreferrer">
            <Button className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Google Maps</Button>
          </a>
          <a href={viatorUrl(destName, 'food tour')} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-xl"><ExternalLink className="w-4 h-4 mr-2" /> Food Tours on Viator</Button>
          </a>
        </div>
      </div>
    );
  }

  const FoodCard = ({ restaurant }) => (
    <div className="bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-inter font-semibold">{restaurant.name}</h4>
          {restaurant.neighborhood && <p className="text-xs text-muted-foreground font-inter">📍 {restaurant.neighborhood}</p>}
          <p className="text-sm text-muted-foreground font-inter mt-0.5">{restaurant.cuisine} • {restaurant.vibe}</p>
          {(restaurant.must_try_dish || restaurant.must_try) && (
            <p className="text-sm font-inter italic text-primary/80 mt-1">Must try: {restaurant.must_try_dish || restaurant.must_try}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(restaurant.halal_certified || restaurant.halal) && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs rounded-lg">Halal Certified</Badge>}
            {!restaurant.halal_certified && restaurant.halal_friendly && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs rounded-lg">Halal Friendly</Badge>}
            {(restaurant.vegetarian_friendly || restaurant.vegetarian) && <Badge className="bg-green-50 text-green-700 border-green-200 text-xs rounded-lg"><Leaf className="w-3 h-3 mr-0.5" /> Veg</Badge>}
            {restaurant.vegan_options && <Badge className="bg-green-50 text-green-700 border-green-200 text-xs rounded-lg">Vegan</Badge>}
            {restaurant.reservations_needed && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs rounded-lg">Reservations Needed</Badge>}
          </div>
          {restaurant.budget_tip && <p className="text-xs text-muted-foreground font-inter mt-2 italic">💡 {restaurant.budget_tip}</p>}
        </div>
        <div className="text-right ml-4">
          {(() => {
            const numT = preferences?.num_travelers || 1;
            const total = (restaurant.price_per_person || 0) * numT;
            return numT > 1 ? (
              <>
                <div className="text-xl font-inter font-bold">${total.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground font-inter">total ({numT} ppl)</div>
                <div className="text-xs text-muted-foreground font-inter">${restaurant.price_per_person} /person</div>
              </>
            ) : (
              <>
                <div className="text-xl font-inter font-bold">${restaurant.price_per_person}</div>
                <div className="text-xs text-muted-foreground font-inter">/person</div>
              </>
            );
          })()}
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t">
        <a href={googleMapsUrl(`${restaurant.name} ${destName}`)} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="rounded-xl text-xs"><ExternalLink className="w-3 h-3 mr-1.5" /> Google Maps</Button>
        </a>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price (Low to High)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-3 items-center flex-wrap">
          {[
            { value: 'street_food_market', label: 'Street Food' },
            { value: 'casual_local', label: 'Casual' },
            { value: 'mid_dining', label: 'Mid-Range' },
            { value: 'upscale_special', label: 'Upscale' },
            { value: 'food_tour_cooking_class', label: 'Food Tours' }
          ].map(cat => (
            <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={filterCategories.includes(cat.value)} onCheckedChange={v => setFilterCategories(v ? [...filterCategories, cat.value] : filterCategories.filter(c => c !== cat.value))} />
              <span className="text-sm font-inter">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Daily Budget Summary */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        {(() => {
          const numT = preferences?.num_travelers || 1;
          return (
            <>
              <h3 className="font-playfair text-lg font-semibold mb-1">Daily Food Budget</h3>
              {numT > 1 && <p className="text-xs text-muted-foreground font-inter mb-4">Showing totals for {numT} travelers</p>}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                  <div className="text-xs text-emerald-700 font-inter font-medium">Budget Day</div>
                  <div className="text-lg font-inter font-bold text-emerald-700">${streetAvg * numT}</div>
                  {numT > 1 && <div className="text-xs text-emerald-600 font-inter">${streetAvg}/person</div>}
                  <div className="text-xs text-emerald-600 font-inter">Street food only</div>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-xl">
                  <div className="text-xs text-primary font-inter font-medium">Balanced Day</div>
                  <div className="text-lg font-inter font-bold text-primary">${casualAvg * numT}</div>
                  {numT > 1 && <div className="text-xs text-primary/70 font-inter">${casualAvg}/person</div>}
                  <div className="text-xs text-primary/70 font-inter">Mix of options</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-xl">
                  <div className="text-xs text-amber-700 font-inter font-medium">Splurge Day</div>
                  <div className="text-lg font-inter font-bold text-amber-700">${splurgeAvg * numT}</div>
                  {numT > 1 && <div className="text-xs text-amber-600 font-inter">${splurgeAvg}/person</div>}
                  <div className="text-xs text-amber-600 font-inter">Sit-down + special</div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {filtered.length > 0 ? (
        <>
          {filterHalal(streetFood).filter(r => filterCategories.length === 0 || filterCategories.includes(r.category)).length > 0 && (
            <div>
              <h3 className="font-playfair text-xl font-semibold mb-4">🥘 Street Food & Markets</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {filterHalal(streetFood).filter(r => filterCategories.length === 0 || filterCategories.includes(r.category)).sort((a, b) => {
                  if (sortBy === 'price') return (a.price_per_person || 0) - (b.price_per_person || 0);
                  return 0;
                }).map((r, i) => <FoodCard key={i} restaurant={r} />)}
              </div>
            </div>
          )}

          {filterHalal(casual).filter(r => filterCategories.length === 0 || filterCategories.includes(r.category)).length > 0 && (
            <div>
              <h3 className="font-playfair text-xl font-semibold mb-4">🍽️ Casual Restaurants</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {filterHalal(casual).filter(r => filterCategories.length === 0 || filterCategories.includes(r.category)).sort((a, b) => {
                  if (sortBy === 'price') return (a.price_per_person || 0) - (b.price_per_person || 0);
                  return 0;
                }).map((r, i) => <FoodCard key={i} restaurant={r} />)}
              </div>
            </div>
          )}

          {filterHalal(special).filter(r => filterCategories.length === 0 || filterCategories.includes(r.category)).length > 0 && (
            <div>
              <h3 className="font-playfair text-xl font-semibold mb-4">✨ Special Experiences Worth the Splurge</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {filterHalal(special).filter(r => filterCategories.length === 0 || filterCategories.includes(r.category)).sort((a, b) => {
                  if (sortBy === 'price') return (a.price_per_person || 0) - (b.price_per_person || 0);
                  return 0;
                }).map((r, i) => <FoodCard key={i} restaurant={r} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">No restaurants match your filters.</div>
      )}

      {/* Food tour link */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h4 className="font-inter font-semibold mb-2">🧑‍🍳 Food Tours & Cooking Classes</h4>
        <p className="text-sm text-muted-foreground font-inter mb-3">Want the full food experience? Book a local food tour or cooking class.</p>
        <a href={viatorUrl(destName, 'food tour')} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="rounded-xl"><ExternalLink className="w-3 h-3 mr-1.5" /> Browse on Viator</Button>
        </a>
      </div>
    </div>
  );
}