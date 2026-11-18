// Connecteur gratuit & sans clé vers Open Food Facts (3M+ aliments mondiaux, Nutri-Score, EAN-13)
// + Classifieur nutritionnel mathématique automatique pour compatibilité avec le moteur d'équivalences

import { AISLE_CATEGORIES } from '../data/foodDatabase.js';

function inferSwapGroupAndAisle(kcal, protein, carbs, fat, rawCategories = '', rawName = '') {
  const catLower = `${rawCategories} ${rawName}`.toLowerCase();

  // Plats protéiques panés / préparés (cordon bleu, nuggets, poisson pané, escalope, viande...)
  if (
    protein >= 10 &&
    (catLower.includes('cordon') ||
      catLower.includes('nugget') ||
      catLower.includes('tender') ||
      catLower.includes('meat') ||
      catLower.includes('poultry') ||
      catLower.includes('volaille') ||
      catLower.includes('poulet') ||
      catLower.includes('dinde') ||
      catLower.includes('jambon') ||
      catLower.includes('saucisse') ||
      catLower.includes('fish') ||
      catLower.includes('poisson'))
  ) {
    return {
      swapGroup: fat <= 6.5 ? 'proteines_maigres' : 'proteines_lipides',
      category: AISLE_CATEGORIES[0],
      defaultGrams: 120,
    };
  }

  // Boissons & Laitages
  if (
    catLower.includes('milk') ||
    catLower.includes('lait') ||
    catLower.includes('yogurt') ||
    catLower.includes('yaourt') ||
    catLower.includes('plant-based-beverages')
  ) {
    if (protein >= 8 && fat <= 3) {
      return {
        swapGroup: 'proteines_maigres',
        category: AISLE_CATEGORIES[3],
        defaultGrams: 180,
      };
    }
    return {
      swapGroup: 'laitiers_boissons',
      category: AISLE_CATEGORIES[3],
      defaultGrams: 180,
    };
  }

  // Sources lipides / Oléagineux / Huiles
  if (fat >= 28 && fat * 9 >= kcal * 0.5) {
    return {
      swapGroup: 'lipides_sains',
      category: AISLE_CATEGORIES[4],
      defaultGrams: 25,
    };
  }

  // Sources protéiques dominantes
  if (protein >= 14 && protein * 4 >= carbs * 4) {
    if (fat <= 6.5) {
      return {
        swapGroup: 'proteines_maigres',
        category: AISLE_CATEGORIES[0],
        defaultGrams: 150,
      };
    }
    return {
      swapGroup: 'proteines_lipides',
      category: AISLE_CATEGORIES[0],
      defaultGrams: 130,
    };
  }

  // Légumineuses
  if (
    catLower.includes('legume') ||
    catLower.includes('lentil') ||
    catLower.includes('bean') ||
    catLower.includes('chickpea')
  ) {
    return {
      swapGroup: 'legumineuses',
      category: AISLE_CATEGORIES[2],
      defaultGrams: 160,
    };
  }

  // Fruits & Légumes peu caloriques
  if (kcal <= 48 && carbs <= 9) {
    return {
      swapGroup: 'legumes',
      category: AISLE_CATEGORIES[1],
      defaultGrams: 180,
    };
  }

  if (
    catLower.includes('fruit') ||
    catLower.includes('compote') ||
    (kcal <= 95 && carbs >= 8 && protein < 3)
  ) {
    return {
      swapGroup: 'fruits',
      category: AISLE_CATEGORIES[1],
      defaultGrams: 140,
    };
  }

  // Par défaut : Glucides complexes / Céréales / Épicerie
  return {
    swapGroup: 'glucides_complexes',
    category: AISLE_CATEGORIES[2],
    defaultGrams: kcal >= 300 ? 80 : 150,
  };
}

function mapAllergenTags(allergensTags = [], ingredientsText = '') {
  const joined = [...allergensTags, ingredientsText].join(' ').toLowerCase();
  const tags = [];
  if (joined.includes('gluten') || joined.includes('wheat') || joined.includes('blé')) {
    tags.push('gluten');
  }
  if (joined.includes('milk') || joined.includes('lait') || joined.includes('lactos')) {
    tags.push('produit_laitier', 'lactose');
  }
  if (joined.includes('egg') || joined.includes('oeuf') || joined.includes('œuf')) {
    tags.push('oeuf');
  }
  if (
    joined.includes('nuts') ||
    joined.includes('peanut') ||
    joined.includes('amande') ||
    joined.includes('noisette') ||
    joined.includes('arachide')
  ) {
    tags.push('fruits_a_coque');
  }
  if (joined.includes('fish') || joined.includes('poisson')) {
    tags.push('poisson');
  }
  if (joined.includes('crustacean') || joined.includes('shrimp') || joined.includes('crevette')) {
    tags.push('crustace');
  }
  if (joined.includes('soy') || joined.includes('soja')) {
    tags.push('soja');
  }
  if (joined.includes('pork') || joined.includes('porc')) {
    tags.push('porc', 'viande');
  }
  return Array.from(new Set(tags));
}

function normalizeOffProduct(p) {
  if (!p || !p.nutriments) return null;
  const rawName = (p.product_name_fr || p.product_name || '').trim();
  if (!rawName) return null;

  const n = p.nutriments;
  const kcal = Math.round(
    Number(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0))
  );
  const protein = Math.round(Number(n.proteins_100g || 0) * 10) / 10;
  const carbs = Math.round(Number(n.carbohydrates_100g || 0) * 10) / 10;
  const fat = Math.round(Number(n.fat_100g || 0) * 10) / 10;
  const fiber = Math.round(Number(n.fiber_100g || 0) * 10) / 10;

  if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 950) return null;

  const rawBrand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
  const brand = rawBrand ? String(rawBrand).split(',')[0].trim() : '';
  const displayName =
    brand && !rawName.toLowerCase().includes(brand.toLowerCase())
      ? `${rawName} · ${brand}`
      : rawName;

  const { swapGroup, category, defaultGrams } = inferSwapGroupAndAisle(
    kcal,
    protein,
    carbs,
    fat,
    p.categories || '',
    rawName
  );

  const code = p.code || `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    id: `off_${code}`,
    barcode: p.code || null,
    name: displayName.slice(0, 68),
    category,
    swapGroup,
    state: 'prêt à consommer',
    defaultGrams,
    nutriscore: p.nutriscore_grade ? String(p.nutriscore_grade).toUpperCase() : null,
    sourceRef: 'Open Food Facts',
    per100g: { kcal, protein, carbs, fat, fiber },
    tags: mapAllergenTags(p.allergens_tags || [], p.ingredients_text || ''),
  };
}

const offQueryCache = new Map();

/**
 * Recherche universelle compatible CORS navigateur (`Access-Control-Allow-Origin: *`) sur Open Food Facts (3M+ références)
 */
export async function searchOpenFoodFacts(query, lang = 'fr', signal = undefined) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];

  const cacheKey = `${lang}:${q}`;
  if (offQueryCache.has(cacheKey)) {
    return offQueryCache.get(cacheKey);
  }

  const host = lang === 'fr' ? 'fr.openfoodfacts.org' : 'world.openfoodfacts.org';
  const fields =
    'code,product_name,product_name_fr,brands,nutriments,nutriscore_grade,allergens_tags,categories';
  const url = `https://${host}/cgi/search.pl?search_terms=${encodeURIComponent(
    q
  )}&search_simple=1&action=process&json=1&page_size=14&fields=${fields}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const rawProducts = data.products || [];

  const seenNames = new Set();
  const normalized = [];

  for (const prod of rawProducts) {
    const item = normalizeOffProduct(prod);
    if (!item) continue;
    const key = item.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    normalized.push(item);
  }

  if (offQueryCache.size > 60) {
    const firstKey = offQueryCache.keys().next().value;
    offQueryCache.delete(firstKey);
  }
  offQueryCache.set(cacheKey, normalized);

  return normalized;
}

/**
 * Recherche directe d'un produit par code-barres EAN-8 / EAN-13
 */
export async function fetchProductByBarcode(barcode) {
  const cleanCode = String(barcode || '').replace(/\D/g, '');
  if (cleanCode.length < 8) return null;

  const url = `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  return normalizeOffProduct(data.product);
}
