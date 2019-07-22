import * as RaftLink from "raftlink.so";
import { Buffer } from "./buffer.js";

var BufferObject = new Buffer();
const buf = BufferObject.allocUnsafe(10);

console.log("alloc length: " + buf.length);

buf.writeUInt32BE(0xfeedface, 0);
buf.writeUInt32BE(0xfeedface, 5);

console.log(buf);
// Prints: <Buffer fe ed fa ce>

buf.writeUInt32LE(0xfeedface, 0);

console.log(buf);

