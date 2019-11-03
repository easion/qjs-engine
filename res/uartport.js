"use strict";

import { EventEmitter } from "./events.js";
import * as utils from "./utils.js";
import { Buffer,concatBuffer } from "./buffer.js";
import { SerialPort } from "./serial.js";

var BufferObject = new Buffer();

/* TODO: const should be set once, maybe */
var EXCEPTION_LENGTH = 5;
var MIN_DATA_LENGTH = 6;
var MAX_BUFFER_LENGTH = 256;


/**
 * Simulate a modbus-RTU port using buffered serial connection.
 *
 * @param path
 * @param options
 * @constructor
 */
export function RTUBufferedPort(path, options) {
    var self = this;

    // options
    if (typeof(options) === "undefined") options = {};

    // disable auto open, as we handle the open
    options.autoOpen = false;

    // internal buffer
    this._buffer = BufferObject.alloc(0);
    //this._id = 0;
    //this._cmd = 0;
    //this._length = 0;

	function onData(data) {
		
        // add data to buffer
		self._buffer = concatBuffer([self._buffer, data]);
        //self._buffer = data; //= Buffer.concat([self._buffer, data]);

		console.log("onData buf: ", self._buffer, self._buffer.byteLength);
		//console.log(self._buffer);
		var bufferLength = self._buffer.byteLength ;
		//console.log("onData byteLength: ");
		//console.log("onData length: ", self._buffer.length);
		
        for (var i = 0; i < bufferLength; ) {
			var length = self._buffer.readUInt8(i);
			if (length + i +1 > bufferLength || length < 1)
			{
				console.log("length error: ", i,length, bufferLength);
				break;
			}
			//console.log("read ok: ", i);
			var cmd = self._buffer.readUInt8(i+1);
			//console.log("receive data : ", length, cmd);
			self._emitData(i, length+1);
			i += (length +1);
		}

    }


    // create the SerialPort
    this._client = new SerialPort(path, options);

    // register the port data event
    this._client.on("data", onData);

    /**
     * Check if port is open.
     *
     * @returns {boolean}
     */
	// this.isOpen = false;
    Object.defineProperty(this, "isOpen", {
        enumerable: true,
        get: function() {
            return this._client.isOpen;
        }
    });

    EventEmitter.call(this);
};
utils.inherits(RTUBufferedPort, EventEmitter);

/**
 * Emit the received response, cut the buffer and reset the internal vars.
 *
 * @param {number} start The start index of the response within the buffer.
 * @param {number} length The length of the response.
 * @private
 */
RTUBufferedPort.prototype._emitData = function(start, length) {
    var buffer = this._buffer.slice(start, start + length);

    //console.log( "emit data serial buffered port",start, length );	
    this.emit("data", buffer);
    this._buffer = this._buffer.slice(start + length);
	//console.log("drop buf: ", this._buffer.byteLength, this._buffer);
};

/**
 * Simulate successful port open.
 *
 * @param callback
 */
RTUBufferedPort.prototype.open = function(callback) {
    this._client.open(callback);

};

/**
 * Simulate successful close port.
 *
 * @param callback
 */
RTUBufferedPort.prototype.close = function(callback) {
    this._client.close(callback);
	
};

/**
 * Send data to a modbus slave.
 *
 * @param {Buffer} data
 */
RTUBufferedPort.prototype.write = function(data) {
    // send buffer to slave
	//console.log("send buf: ", data);
    this._client.write(data);

};
