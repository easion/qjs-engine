/* example of JS module importing a C module */

import * as utils from "./utils.js";
import {RTUBufferedPort} from "./uartport.js";
import { Buffer,concatBuffer } from "./buffer.js";
import { EByteType,EByteCommand } from "./data-ebyte.js";
import {addPromiseAPI} from "./promise-ebyte.js";

var BufferObject = new Buffer();



/**
 * Class making SerialMesh calls fun and easy.
 *
 * @param {SerialPort} port the serial port to use.
 */
export  function SerialMesh(port) {
	console.log("SerialMesh go super");
    // the serial port to use
    this._port = port;

    // state variables
    this._transactions = {};
    this._timeout = null; // timeout in msec before unanswered request throws timeout error
    //this._unitID = 1;
};

function _startTimeout(duration, transaction) {
    if (!duration) {
		//console.log("_startTimeout called undefined");
        return undefined;
    }
    return os.setTimeout( function() {
        transaction._timeoutFired = true;
        if (transaction.next) {
            transaction.next(new TransactionTimedOutError());
        }
    }, duration);
}

/**
 * Cancel the given timeout.
 *
 * @param {number} timeoutHandle The handle of the timeout
 * @private
 */
function _cancelTimeout(timeoutHandle) {
	if (timeoutHandle === undefined)
	{
		return;
	}
	try
	{		
		os.clearTimeout(timeoutHandle);
	}
	catch (e)
	{
		console.log("cancelTimeout error: " + e);
		console.log("timeoutHandle type: " + (typeof timeoutHandle));
	}
}

SerialMesh.prototype.open = function(callback) {
    var _that = this;

    // open the serial port
    _that._port.open(function(error) {
        if (error) {
            console.log({ action: "port open error", error: error });
            /* On serial port open error call next function */
            if (callback)
                callback(error);
        } else {
            /* init ports transaction id and counter */
            _that._port._transactionIdRead = 1;
            _that._port._transactionIdWrite = 1;

            /* On serial port success
             * register the _that parser functions
             */
            _that._port.on("data", function(data) {
				var event_val = null;
               //
			   var transaction = _that._transactions[_that._port._transactionIdRead];

                // the _transactionIdRead can be missing, ignore wrong transaction it's
                if (!transaction) {
                    return;
                }

                /* cancel the timeout */
                _cancelTimeout(transaction._timeoutHandle);
                transaction._timeoutHandle = undefined;

                /* check if the timeout fired */
                if (transaction._timeoutFired === true) {
                    // we have already called back with an error, so don't generate a new callback
                    return;
                }

				/* check minimal length
                 */
                if (data.length < 3) {
                    error = "Data length error, expected " +
                        transaction.nextLength + " got " + data.length;
                    if (transaction.next)
                        transaction.next(new Error(error));
                    return;
                }

				var length2 = data.readUInt8(0);
				var dir = data.readUInt8(1);
				var cmd = data.readUInt8(2);
				switch (dir)
				{
				case EByteType.OP_RECV_CMD:
					break;
				case EByteType.OP_RECV_SIG:
					console.log("-----recv sig ------");
					console.log(data);
					return;
					break;
				case EByteType.OP_RECV_DATA:
					console.log("-----recv data ------");
					console.log(data);
					return;
					break;
				default:
					error = "Data type error, expected dir " + dir;
                    if (transaction.next)
                        transaction.next(new Error(error));
                    return;
					//break;				
				}
				switch (cmd)
				{
				case EByteCommand.CMD_EBYTE_GET_NET_KEY:
				case EByteCommand.CMD_EBYTE_SET_NET_KEY:
					//break;
				case EByteCommand.CMD_EBYTE_GET_APP_KEY:
				case EByteCommand.CMD_EBYTE_SET_APP_KEY:
					event_val = [];
					for (var i=0; i<16; i++)
					{
						event_val.push(data.readUInt8(3+i));
					}
					break;
				case EByteCommand.CMD_EBYTE_SET_NET_ADDRESS:
				case EByteCommand.CMD_EBYTE_GET_NET_ADDRESS:
					event_val = data.readUInt16LE(3);
					break;
				case EByteCommand.CMD_EBYTE_JOIN_NET:
					{
					console.log("--JOIN NET-------");
					console.log(data);
					event_val = {mac:[]};
					for (var i=0; i<6; i++)
					{
						event_val.mac.push(data.readUInt8(3+i));
					}
					event_val.address = data.readUInt16LE(3+6);
					event_val.items = data.readUInt8(3+6+2);
					}
					break;
				case EByteCommand.CMD_EBYTE_SET_UART: //CMD_EBYTE_SET_UART:
				case EByteCommand.CMD_EBYTE_GET_UART: //:
				case EByteCommand.CMD_EBYTE_SET_POWER: //:
				case EByteCommand.CMD_EBYTE_GET_POWER: //:
				event_val = data.readUInt8(3);
				break;
				case EByteCommand.CMD_EBYTE_GET_MAC: //:
				event_val = [];
				for (var i=0; i<6; i++)
				{
					event_val.push(data.readUInt8(3+i));
				}
				break;
				case EByteCommand.CMD_EBYTE_REBOOT_HW: //:
				case EByteCommand.CMD_EBYTE_RESET_HW: //:
					event_val = data.readUInt8(3);
				break;
				case EByteCommand.CMD_EBYTE_HW_VERSION: //
					event_val = data.readUInt16LE(3);
				break;
				default:
					error = "command type error, expected dir " + cmd;
                    if (transaction.next)
                        transaction.next(new Error(error));
                    return;
					break;					
				}
				// console.log("length2 ", length2, cmd);

				/*console.log("data ", data);
				var length = data.readUInt8(0);
				var cmd = data.readUInt8(1);
				console.log("length ", length, cmd);
				*/

				if (transaction.next){
					//console.log("Go next ");
					transaction.next(null, { "data": data, "value": event_val });
				}
				else{
					console.log("No next ");
				}
               
            });

            /* On serial port open OK call next function with no error */
            if (callback)
                callback(error);
        }
    });
};

Object.defineProperty(SerialMesh.prototype, "isOpen", {
    enumerable: true,
    get: function() {
        if (this._port) {
            return this._port.isOpen;
        }

        return false;
    }
});

SerialMesh.prototype.close = function(callback) {
    // close the serial port if exist
    if (this._port) {
        this._port.removeAllListeners("data");
        this._port.close(callback);
    } else {
        // nothing needed to be done
        callback();
    }
};

/**
 * Destory the serial port
 *
 * @param {Function} callback the function to call next on close success
 *      or failure.
 */
SerialMesh.prototype.destroy = function(callback) {
    // close the serial port if exist and it has a destroy function
    if (this._port && this._port.destroy) {
        this._port.removeAllListeners("data");
        this._port.destroy(callback);
    } else {
        // nothing needed to be done
        callback();
    }
};


    var open = function(obj, next) {
        /* the function check for a callback
         * if we have a callback, use it
         * o/w build a promise.
         */
        if (next) {
            // if we have a callback, use the callback
            obj.open(next);
        } else {
            // o/w use  a promise
            var promise = new Promise(function(resolve, reject) {
                function cb(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }

                obj.open(cb);
            });

            return promise;
        }
    };

SerialMesh.prototype.connectDevice = function(path, options, next) {
	// check if we have options
	if (typeof next === "undefined" && typeof options === "function") {
		next = options;
		options = {};
	}

	// check if we have options
	if (typeof options === "undefined") {
		options = {};
	}
	// create the SerialPort
	//var SerialPort = require("../ports/rtubufferedport");
	this._port = new RTUBufferedPort(path, options);

	// set vmin to smallest modbus packet size
	//options.platformOptions = { vmin: MIN_MODBUSRTU_FRAMESZ, vtime: 0 };

	// open and call next
	return open(this, next);
};



SerialMesh.prototype._writeBufferToPort = function(buffer, transactionId) {
    var transaction =this._transactions[transactionId];

	//console.log("_writeBufferToPort transactionId " + transactionId);
	//console.log("send port: ", buffer);
    this._port.write(buffer);
    if (transaction) {
        transaction._timeoutFired = false;
        transaction._timeoutHandle = _startTimeout(this._timeout, transaction);
    }
	else{
		console.log("_writeBufferToPort no no");
	}
}

SerialMesh.prototype.writeCommand = function(arg,  next) {
    // check port is actually open before attempting write
    if (this.isOpen !== true) {
		console.log("writeCommand not opened");
        if (next) next(new PortNotOpenError());
        return;
    }
	//console.log("writeCommand arg", arg);

    // set state variables
    this._transactions[this._port._transactionIdWrite] = {
        nextCode: arg,
        next: next
    };
    // write buffer to serial port
    this._writeBufferToPort.call(this, arg, this._port._transactionIdWrite);
};


SerialMesh.prototype.doWriteVersion = function(arg,  next) {

    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_HW_VERSION, 2);
    this.writeCommand(buf, next);
};


SerialMesh.prototype.doWriteAppkey = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_GET_APP_KEY, 2);
    this.writeCommand(buf, next);
};

SerialMesh.prototype.doWriteNetkey = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_GET_NET_KEY, 2);
    this.writeCommand(buf, next);
};


SerialMesh.prototype.doWritePower = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_GET_POWER, 2);
    this.writeCommand(buf, next);
};


SerialMesh.prototype.doWriteAddress = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_GET_NET_ADDRESS, 2);
    this.writeCommand(buf, next);
};


SerialMesh.prototype.doWriteJoin = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_JOIN_NET, 2);
    this.writeCommand(buf, next);
};

SerialMesh.prototype.doWriteReboot = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_REBOOT_HW, 2);
    this.writeCommand(buf, next);
};


SerialMesh.prototype.doWriteUART = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_GET_UART, 2);
    this.writeCommand(buf, next);
};

SerialMesh.prototype.doWriteResetHw = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

    buf.writeUInt8(0x02, 0);
    buf.writeUInt8(EByteType.OP_SEND_CMD, 1);
    buf.writeUInt8(EByteCommand.CMD_EBYTE_RESET_HW, 2);
    this.writeCommand(buf, next);
};

/////////////

SerialMesh.prototype.doWriteSigMsg = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

	var size  = 3 + arg.data.length;

    buf.writeUInt8(size, 0);
    buf.writeUInt8(EByteType.OP_SEND_SIG, 1);
    buf.writeUInt16(arg.address, 2);
	for (var i=0; i<arg.data.length; i++)
	{
		buf.writeUInt8(arg.data[i], 4+i);
	}
    this.writeCommand(buf, next);
};


SerialMesh.prototype.doWriteDataMsg = function(arg,  next) {
    var buf = BufferObject.alloc( 3); // add 2 crc bytes

	var size  = 3 + arg.data.length;

    buf.writeUInt8(size, 0);
    buf.writeUInt8(EByteType.OP_SEND_DATA, 1);
    buf.writeUInt16(arg.address, 2);
	for (var i=0; i<arg.data.length; i++)
	{
		buf.writeUInt8(arg.data[i], 4+i);
	}
    this.writeCommand(buf, next);
};

addPromiseAPI(SerialMesh);

