import * as RaftLink from "raftlink.so";
import { Buffer } from "./buffer.js";

var promise1 = new Promise(function(resolve, reject) {
  os.setTimeout(3000,function() {
    resolve('foo');
  });
});

promise1.then(function(value) {
  console.log("args: " + value);
  // expected output: "foo"
});

console.log("start promise test");

