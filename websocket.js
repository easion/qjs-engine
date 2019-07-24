import * as WebSocket from "ws.so";
import * as utils from "../res/utils.js";

const ws = WebSocket.open('ws://www.host.com/path');

ws.on('open', function open() {
  ws.send('something');
});

ws.on('message', function incoming(data) {
  console.log(data);
});
