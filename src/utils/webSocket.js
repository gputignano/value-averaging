import WebSocket from "ws";

export default function createBinanceSocket(url) {
  let socket = null;
  let reconnectInterval = 5000;
  let manualClose = false;
  const listeners = {};

  const connect = () => {
    socket = new WebSocket(url);

    socket.on('open', (event) => {
      console.log('WebSocket connesso a Binance');
      reconnectInterval = 5000;
      manualClose = false;
      if (listeners['open']) listeners['open'](event);
      ;
    });

    socket.on('message', (data) => {
      if (listeners['message']) listeners['message'](data);
    });

    socket.on('ping', (data) => {
      // console.log('Ping ricevuto, invio pong...');
      socket.pong(data); // Rispondi al ping
      if (listeners['ping']) listeners['ping'](data);
    });

    socket.on('close', (code, reason) => {
      console.log(`Connessione chiusa: ${code} ${reason}`);
      if (listeners['close']) listeners['close'](code, reason);
      if (!manualClose) reconnect();
    });

    socket.on('error', (error) => {
      console.error('Errore WebSocket:', error);
      if (listeners['error']) listeners['error'](error);
      if (!manualClose) reconnect();
    });
  };

  const reconnect = () => {
    console.log(`Riconnessione in ${reconnectInterval / 1000} secondi...`);
    setTimeout(connect, reconnectInterval);
    reconnectInterval = Math.min(reconnectInterval * 2, 60000);
  };

  connect();

  return {
    getSocket: () => socket,
    send: (data) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      } else {
        console.error('Socket non connesso o non aperto');
      }
    },
    close: () => {
      if (socket) {
        manualClose = true;
        socket.close();
      }
    },
    on: (event, handler) => {
      listeners[event] = handler;
    },
  };
}

