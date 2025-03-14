import WebSocket from "ws";

const WS_STATES = {
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED
};

/**
 * Creates a WebSocket connection with reconnection handling and automatic ping response
 * @param {String} url - WebSocket URL
 * @param {Object} handlers - Event handlers
 * @param {Object} options - Configuration options
 * @returns {Object} - Interface to control the WebSocket
 */
export const createWebSocketConnection = (
  url,
  handlers = {},
  options = {}
) => {
  // Configuration with default values
  const config = Object.freeze({
    reconnectDelay: 5000,
    maxReconnectAttempts: -1,
    autoReconnect: true,
    debug: false,
    connectionTimeout: 10000,
    ...options
  });

  // Handlers with default values
  const {
    onMessage = () => { },
    // onOpen = () => { },
    // onError = (error) => console.error(error),
    // onClose = () => { },
    // onPing = () => { },
    onConnected = () => { },
    onDisconnected = () => { }
  } = handlers;

  // State
  let ws = null;
  let reconnectAttempts = 0;
  let reconnectTimeout = null;
  let isManualClose = false;
  let wasConnectedBefore = false;

  // Utility
  const log = (message) => config.debug && console.log(message);

  // WebSocket connection
  const connect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    log(`Connecting to: ${url}`);

    ws = new WebSocket(url);

    let connectionTimeoutId = null;
    if (config.connectionTimeout > 0) {
      connectionTimeoutId = setTimeout(() => {
        if (ws && ws.readyState === WS_STATES.CONNECTING) {
          log(`Connection timeout after ${config.connectionTimeout}ms`);
          ws.close();
        }
      }, config.connectionTimeout);
    }

    ws.on("open", () => {
      if (connectionTimeoutId) clearTimeout(connectionTimeoutId);  // Cancella il timeout se la connessione ha successo

      reconnectAttempts = 0;
      // onOpen();

      if (!wasConnectedBefore) {
        wasConnectedBefore = true;
        onConnected();
      }
    });

    ws.on("message", (data, isBinary) => {
      try {
        if (isBinary) {
          onMessage(data);
        } else {
          onMessage(JSON.parse(data));
        }
      } catch (error) {
        log(`Error parsing message: ${error.message}`);
        onMessage(data);
      }
    });

    ws.on("error", (error) => {
      if (connectionTimeoutId) clearTimeout(connectionTimeoutId);  // Cancella anche in caso di errore

      log(`Error: ${error}`);
      // onError(error);
    });

    ws.on("close", (code, reason) => {
      log(`Connection closed (Code: ${code}, Reason: ${reason || 'none'})`);
      // onClose(code, reason);

      if (wasConnectedBefore && (isManualClose || reconnectAttempts >= config.maxReconnectAttempts)) {
        wasConnectedBefore = false;
        onDisconnected();
      }

      if (isManualClose || !config.autoReconnect) return;

      reconnectAttempts += 1;

      // Check if it should reconnect
      if (config.maxReconnectAttempts === -1 || reconnectAttempts < config.maxReconnectAttempts) {
        const delay = Math.min(config.reconnectDelay * Math.pow(1.5, reconnectAttempts - 1), 60000);
        log(`Reconnection attempt ${reconnectAttempts} in ${delay}ms`);
        reconnectTimeout = setTimeout(connect, delay);
      } else {
        log("Maximum number of reconnection attempts reached");
      }
    });

    // Automatic handling of ping events
    ws.on("ping", (data) => {
      // Automatically responds with a pong
      if (ws && ws.readyState === WS_STATES.OPEN) ws.pong(data);

      // Notifies the ping through the custom callback
      // onPing(data);
    });

    return ws;
  };

  // Start the connection
  connect();

  // Immutable interface
  return Object.freeze({
    close: () => {
      isManualClose = true;
      if (ws && ws.readyState === WS_STATES.OPEN) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    },

    reconnect: () => {
      isManualClose = false;
      if (ws && ws.readyState === WS_STATES.OPEN) {
        ws.close();
      } else {
        connect();
      }
    },

    send: (data) => {
      if (ws && ws.readyState === WS_STATES.OPEN) {
        if (data instanceof ArrayBuffer || data instanceof Buffer) {
          ws.send(data);
        } else {
          ws.send((typeof data === 'string') ? data : JSON.stringify(data));
        }
        return true;
      }
      return false;
    },

    // Sends a manual pong (rarely needed since pongs are sent automatically)
    sendPong: (data) => {
      if (ws && ws.readyState === WS_STATES.OPEN) {
        ws.pong(data);
        log("Manual pong sent");
        return true;
      }
      return false;
    },

    getStatus: () => ({
      isConnected: ws && ws.readyState === WS_STATES.OPEN,
      reconnectAttempts,
      isManualClose
    }),

    // setHandler: (handlerName, handlerFunction) => {
    //   if (typeof handlerFunction === 'function') {
    //     switch (handlerName) {
    //       case 'onMessage': onMessage = handlerFunction; break;
    //       case 'onOpen': onOpen = handlerFunction; break;
    //       case 'onError': onError = handlerFunction; break;
    //       case 'onClose': onClose = handlerFunction; break;
    //       case 'onPing': onPing = handlerFunction; break;
    //       default: return false;  // Nome handler non valido
    //     }
    //     return true;  // Handler modificato con successo
    //   }
    //   return false;  // Non è stata fornita una funzione valida
    // }

    setHandler: (handlerName, handlerFunction) => {
      if (typeof handlerFunction === 'function' && handlers.hasOwnProperty(handlerName)) {
        handlers[handlerName] = handlerFunction;
        return true;  // Handler aggiornato con successo
      }
      return false;  // Handler non valido o nome errato
    }
  });
};

// Export the function
export default createWebSocketConnection;