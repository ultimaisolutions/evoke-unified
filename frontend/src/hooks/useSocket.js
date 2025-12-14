import { useEffect, useState } from 'react';
import { connectSocket, disconnectSocket, isSocketConnected } from '../lib/socket';

/**
 * Hook for managing socket connection lifecycle
 */
export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect on mount
    connectSocket();

    // Check connection status
    const checkConnection = setInterval(() => {
      setConnected(isSocketConnected());
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(checkConnection);
      disconnectSocket();
    };
  }, []);

  return { connected };
}

export default useSocket;
