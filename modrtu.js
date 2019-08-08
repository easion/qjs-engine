import * as RaftLink from "raftlink.so";
import {ModbusRTU} from "../res/modbus/index.js";

var client = new ModbusRTU();

console.log("--new okey--");
/*
Code portting from:
https://github.com/yaacov/node-modbus-serial
*/
// open connection to a serial port
client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: 9600 }, read);


function write() {
    client.setID(1);

    // write the values 0, 0xffff to registers starting at address 5
    // on device number 1.
    client.writeRegisters(5, [0 , 0xffff])
        .then(read);
}

function read2() {
    // read the 2 registers starting at address 5
    // on device number 1.
    client.readHoldingRegisters(5, 2)
        .then(console.log);
}

const getMeterValue = async (id,addr) => {
    try {
        // set ID of slave
        await client.setID(id);
		console.log("setid OK");
        // read the 1 registers starting at address 1 (first register)
        let val =  await client.readInputRegisters(addr, 1);
        // return the value
        return val.data[0];
    } catch(e){
		console.log("Failed: " + e);
        // if error return -1
        return -1
    }
}

const sleep = (ms) => new Promise(resolve => os.setTimeout(resolve,ms));

function read() {
	console.log("--open rtu okey--");

	client.readInputRegisters(1, 1)
    .then(function (t){
	  console.log("temperature: " +t.data[0]);
	  return client.readInputRegisters(2,1);
	})
	.then(function (h){
	  console.log("humidity: " +h.data[0]);
	}).
	catch ((err) => {
		console.log("error: " +err);
    });
}

