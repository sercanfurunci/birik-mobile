import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { BASE_CATS, INCOME_ONLY_CATS, BASE_CAT_COLORS, CUSTOM_PALETTE } from '../constants/categories';

const CatsContext = createContext(null);

export function CategoriesProvider({ initialCats = [], onSave, children }) {
  const [customCats, setCustomCats] = useState(Array.isArray(initialCats) ? initialCats : []);
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current && Array.isArray(initialCats) && initialCats.length > 0) {
      seeded.current = true;
      setCustomCats(initialCats);
    }
  }, [initialCats]);

  const addCat = useCallback((label, kind = 'expense') => {
    const id = label.trim();
    if (!id) return 'empty';
    const lower = id.toLowerCase();
    const normalizedKind = kind === 'income' ? 'income' : 'expense';
    const isReservedExpense = BASE_CATS.includes(lower) && !INCOME_ONLY_CATS.includes(lower);
    const isReservedIncome = INCOME_ONLY_CATS.includes(lower) || lower === 'other';
    if (normalizedKind === 'expense' && isReservedExpense) return 'reserved';
    if (normalizedKind === 'income' && isReservedIncome) return 'reserved';
    if (customCats.find(c => c.id.toLowerCase() === lower && (c.kind || 'expense') === normalizedKind)) return 'exists';
    setCustomCats(prev => {
      if (prev.find(c => c.id.toLowerCase() === lower && (c.kind || 'expense') === normalizedKind)) return prev;
      const color = CUSTOM_PALETTE[prev.length % CUSTOM_PALETTE.length];
      const next = [...prev, { id, color, kind: normalizedKind }];
      onSave?.(next);
      return next;
    });
    return 'ok';
  }, [customCats, onSave]);

  const removeCat = useCallback((id) => {
    setCustomCats(prev => {
      const next = prev.filter(c => c.id !== id);
      onSave?.(next);
      return next;
    });
  }, [onSave]);

  const getCatColor = useCallback((cat, kind) => {
    if (BASE_CAT_COLORS[cat]) return BASE_CAT_COLORS[cat];
    if (kind) {
      const normalized = kind === 'income' ? 'income' : 'expense';
      const exact = customCats.find(c => c.id === cat && (c.kind || 'expense') === normalized);
      if (exact) return exact.color;
    }
    return customCats.find(c => c.id === cat)?.color ?? '#94A3B8';
  }, [customCats]);

  const customIncome = customCats.filter(c => c.kind === 'income').map(c => c.id);
  const customExpense = customCats.filter(c => c.kind !== 'income').map(c => c.id);
  const allCats = [...BASE_CATS, ...customCats.map(c => c.id)];
  const expenseCats = [...BASE_CATS.filter(c => !INCOME_ONLY_CATS.includes(c)), ...customExpense];
  const incomeCats = [...INCOME_ONLY_CATS, 'other', ...customIncome];

  return (
    <CatsContext.Provider value={{ customCats, allCats, expenseCats, incomeCats, addCat, removeCat, getCatColor }}>
      {children}
    </CatsContext.Provider>
  );
}

export const useCategories = () => useContext(CatsContext);
