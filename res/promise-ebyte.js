"use strict";

var _convert = function(f) {
    var converted = function( arg, next) {
        var client = this;
        //var id = this._unitID;

		//console.log("_convert called");

        /* the function check for a callback
         * if we have a callback, use it
         * o/w build a promise.
         */
        if (next) {
            // if we have a callback, use the callback
            f.bind(client)( arg, next);
        } else {
            // o/w use  a promise
            var promise = new Promise(function(resolve, reject) {
                function cb(err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                }

                f.bind(client)( arg, cb);
            });

            return promise;
        }
    };

    return converted;
};

export function addPromiseAPI(Modbus) {

    var cl = Modbus.prototype;

    // set/get unitID
    cl.setID = function(id) {this._unitID = id;};
    cl.getID = function() {return this._unitID;};

    // set/get timeout
    cl.setTimeout = function(timeout) {this._timeout = timeout;};
    cl.getTimeout = function() {return this._timeout;};

/*
	
   */
    cl.readVersion = _convert(cl.doWriteVersion);
    cl.readAppkey = _convert(cl.doWriteAppkey);
    cl.readNetID = _convert(cl.doWriteNetkey);

	//
    cl.readPower = _convert(cl.doWritePower);
    cl.readAddress = _convert(cl.doWriteAddress);
    cl.rebootHw = _convert(cl.doWriteReboot);
    cl.resetHW = _convert(cl.doWriteResetHw);
    cl.joinNet = _convert(cl.doWriteJoin);
    cl.readUart = _convert(cl.doWriteUART);

    cl.sendSigMsg = _convert(cl.doWriteSigMsg);
    cl.sendDataMsg = _convert(cl.doWriteDataMsg);
};

