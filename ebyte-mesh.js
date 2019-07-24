/* 
http://www.ebyte.com/product-view-news.aspx?id=606

*/
import {SerialMesh} from "../res/serial-ebyte.js";

var client = new SerialMesh();
console.log("--open ebyte okey--");


// open connection to a serial port
client.connectDevice("/dev/ttyUSB0", { baudRate: 115200 }, read);



function read() {
	console.log("--open uart okey--");

	client.readVersion(1)
    .then(function (t){
	  console.log("readVersion: " +t.value);
	  return client.readAppkey(2);
	})
	.then(function (t){
	  console.log("readAppkey: " +t.value);
	  return client.readNetID(2);
	})
	.then(function (t){
	  console.log("readNetID: " +t.value);
	  return client.readAddress(2);
	})
	.then(function (t){
	  console.log("readAddress: " +t.value);
	  return client.readPower(2);
	})
	.then(function (t){
	  console.log("readPower: " +t.value);
	  return client.joinNet(2);
	})
	.then(function (t){
	  console.log("joinNet: " +t.value);
	  //return client.joinNet(2);
	})
}

const sleep = (ms) => new Promise(resolve => os.setTimeout(ms, resolve));
