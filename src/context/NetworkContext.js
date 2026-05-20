import { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext({ isOnline: true, onReconnect: () => {} });

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const reconnectCallbacks = useRef([]);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(connected);
      if (connected && wasOffline.current) {
        reconnectCallbacks.current.forEach(cb => cb());
      }
      wasOffline.current = !connected;
    });
    return unsub;
  }, []);

  const onReconnect = (cb) => {
    reconnectCallbacks.current.push(cb);
    return () => {
      reconnectCallbacks.current = reconnectCallbacks.current.filter(f => f !== cb);
    };
  };

  return (
    <NetworkContext.Provider value={{ isOnline, onReconnect }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
