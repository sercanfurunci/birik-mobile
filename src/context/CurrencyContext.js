import { createContext, useContext } from 'react';
import { CURRENCIES } from '../constants/currencies';

const CurrencyContext = createContext({ code: 'USD', symbol: '$' });

export function CurrencyProvider({ code, children }) {
  const found = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  return (
    <CurrencyContext.Provider value={found}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
