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

var tcpSock = -1;

function connect_read_cb(sock) {
	console.log("read cb  by child");
	var bytes = 10;

	var data = new ArrayBuffer(bytes+1);
	var total = os.read(sock, data,0,bytes);
	if (total === bytes)
	{
		console.log("->recv ok: " + data[0]);
	}
	else if (total == 0)
	{	
		console.log("read but closed: " + bytes);
		os.setReadHandler(sock, null);
		os.close(sock);			
	}
	else{
		console.log("read fail: " + total);
		return;
	}

}


function hap_accept_cb(tcpSock) {
	
	try
	{		
		var obj = net.accept(tcpSock);
		console.log("accept ip: " + obj.ip);
		console.log("accept port: " + obj.port);
		console.log("accept fd: " + obj.file);
		os.setReadHandler(obj.file, connect_read_cb);
	}
	catch (e)
	{
		console.log("accept called " + e);
	}
}

function socket_test()
{
	var rv;
	var sock = net.socket(net.AF_INET, net.SOCK_STREAM, 0);
	rv = net.bind(sock, "0.0.0.0", 1233);
	console.log("bind result: " + rv);
	rv = net.listen(sock,5);
	console.log("listen result: " + rv);
	os.setReadHandler(sock, hap_accept_cb);
	return sock;
}

function ssdp_recv_cb(sock)
{
	var data = new ArrayBuffer(1500);
	try
	{
		var obj = net.recvfrom(sock,data,0,1500);
		if (obj.size > 0)
		{
			console.log("recv from: " + obj.ip + ", port " + obj.port);
			var str = utils.decodeUtf8(data.slice(0, obj.size));
			console.log("recv data: " + str);

			var resp = utils.encodeUTF8("hello");
			/*
			var rv = net.sendto(sock,resp.buffer,0,resp.length,
				"239.255.255.250",1900);
				*/
			//console.log("send data: " + rv);
		}
		else{
		}
	}
	catch (e)
	{
		console.log("Err: " + str);
	}
}

function ssdp_test()
{
	var rv;
	var sock = net.socket(net.AF_INET, net.SOCK_DGRAM, 0);
	rv = net.bind(sock, "0.0.0.0", 1900);
	console.log("bind result: " + rv);

	rv = net.setsockopt(sock, net.SOL_SOCKET, net.SO_REUSEADDR,1);
	console.log("reuseaddr result: " + rv);

	rv = net.setsockopt(sock, net.IPPROTO_IP, net.IP_ADD_MEMBERSHIP,
		"239.255.255.250",
		"192.168.19.1");
	console.log("membership result: " + rv);

	os.setReadHandler(sock, ssdp_recv_cb);
	return sock;
}

console.log("OS Platform: " + os.platform);

open();
tcpSock = socket_test();
//ssdp_test();


class MyClass {
  constructor(x, y) {
    this.x = x;
    this.y = y;
	console.log("constructor calling: " + this.toString());
  }

  toString() {
    return '(' + this.x + ', ' + this.y + ')';
  }
}


var ok = new MyClass(1,2);

