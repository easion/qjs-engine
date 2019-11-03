import * as utils from "./utils.js";
import * as net from "socket.so";

var globalFd = -1;
var globalCb = null;
var errorCb = null;
var next_read = 0;
var next_pos = 0;
var global_data = new ArrayBuffer(4096);

function hap_read_cb() {
	if (next_read == 0)
	{
		var data = new ArrayBuffer(8+1);
		var total = os.read(globalFd, data,0,8);
		if (total === 8)
		{
			data[8] = 0;
			next_read = parseInt(utils.decodeUtf8(data));
			next_pos = 0;
			/*for (var i=0; i<global_data.length; i++)
			{
				global_data[i] = 0;
			}*/
		}
		else if (total == 0)
		{			
			fault();			
		}
		else{
			return;
		}
	}
	total = os.read(globalFd, global_data,next_pos,next_read);
	if (total > 0)
	{
		next_pos += total;
		next_read -= total;
	}
	else if (total == 0)
	{			
		fault();			
	}
	else{
		console.log("read total fail: " + total);
		return;
	}
	if (next_read == 0)
	{
		global_data[next_pos] = 0;
		var str = utils.decodeUtf8(global_data.slice(0, next_pos));		

		try
		{
			var json = JSON.parse(str);
			globalCb(json);	
			//console.log("read event "+ str);
		}
		catch (e)
		{
			console.log("string --> "+ str);
			console.log("JSON ("+next_pos+") error: ", e);
		}
		
	}
	else{
		console.log("read next: ");
	}
}

var next_write_buf = null;
var next_write_sz = 0;
var next_write_pos = 0;
var next_writting = false;

function hap_write_cb() {
	if (next_write_sz <= 0)
	{
		os.setWriteHandler(globalFd, null);
		next_writting = false;
		return;
	}
	var total = os.write(globalFd, next_write_buf.buffer,
		next_write_pos,next_write_sz);
	if (total > 0)
	{
		next_write_pos += total;
		next_write_sz -= total;
	}
}

export function send(json) {
	if (globalFd == -1)
	{
		open();
	}
	var bodystr = JSON.stringify(json, null, 0);
	var strsz = bodystr.length+"";
	var left = (8 - strsz.length);

	for (var i=0; i<left; i++)
	{
		strsz += '-';
	}
	//console.log("strsz: " + strsz);
	//console.log("bodystr: " + bodystr);
	var total = os.write(globalFd, utils.encodeUTF8(strsz).buffer,0,strsz.length);
	if (total != strsz.length)
	{
		console.log("write total failed: " + total);
		return;
	}

	var maindata = utils.encodeUTF8(bodystr);
	/*try send*/
	var total = os.write(globalFd, maindata.buffer,0,maindata.length);
	if (total === maindata.length)
	{
		return;
	}
	else if (total < 0)
	{
		console.log("write error! " );
		return;
	}

	/*part send*/
	if (next_writting === true)
	{
		console.log("write busy now! " );
		return;
	}
	
	next_write_buf = maindata;
	next_write_pos = total;
	next_write_sz = maindata.length - total;
	os.setWriteHandler(globalFd, hap_write_cb);
	next_writting = true;
}

export function requestEvent(cb) {
	globalCb = cb;
}

export function setError(cb) {
	errorCb = cb;
}

function fault() {
	close();
	if (errorCb)
	{
		errorCb('disconnect');
	}
}

export function close() {
	if (globalFd >= 0)
	{
		os.setReadHandler(globalFd, null);
		console.log("hap close fd as: " + globalFd);
		os.close(globalFd);
		globalFd = -1;
	}
	else{
	}
}

export function open(cb) {
	var result = 'ok';
	close();
	next_writting = false;
	try
	{	
		globalFd = net.udsOpen("/tmp/hap_register_bus");
		console.log("hap open fd as: " + globalFd);
		os.setReadHandler(globalFd, hap_read_cb);
	}
	catch (e)
	{
		globalFd = -1;
		result = 'error';
		console.log("hap open failed: ", e);
	}	
	if (typeof cb !== 'undefined')
	{
		cb(result);
	}
}

globalFd=-1;


