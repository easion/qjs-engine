/* example of JS module importing a C module */
import * as net from "socket.so";
import * as utils from "../res/utils.js";

var uartFd = -1;

function read_uart(sock, bytes) {	
	
	var data = new ArrayBuffer(bytes+1);
	var total = 0;
	try
	{		
		total = os.read(sock, data,0,bytes);
	}
	catch (e)
	{
		console.log("read error: " + e);
		return;
	}
	if (total === bytes)
	{
		console.log("->recv ok: " + data[0]);
	}
	else if (total == 0)
	{	
		console.log("read but closed: " + bytes);
		fault();			
	}
	else{
		console.log("read fail: " + total);
		return;
	}
	
}

function uart_read_cb(sock) {
	console.log("read cb called");
	read_uart(sock, 1);	
}


function fault() {
	//close();
	if (errorCb)
	{
		errorCb('disconnect');
	}
}

function open()
{
	var rv;

	uartFd = os.open("/dev/ttyUSB0", os.O_RDWR);
	if (uartFd < 0)
	{
		console.log("Open UART FAILED");
		return;
	}
	console.log("open result: " + uartFd);
	rv = net.setUart(uartFd,115200,8,'N',1);
	console.log("setUart result: " + rv);
	rv = net.nonblock(uartFd);
	console.log("nonblock result: " + rv);
	os.setReadHandler(uartFd, uart_read_cb);
	read_uart(uartFd,255);
	//var getKeyCmd = utils.encodeUTF8("AT\r\n");
	var getKeyCmd = new Uint8Array([0x02, 0xc0, 0x01]);

	var total = os.write(uartFd, getKeyCmd.buffer,0,getKeyCmd.length);
	if (total != getKeyCmd.length)
	{
		console.log("write uart failed: " + total);
		return;
	}
	console.log("UART Write:" + getKeyCmd.length);
}



console.log("OS Platform: " + os.platform);

open();

