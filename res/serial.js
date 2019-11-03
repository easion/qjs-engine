import * as net from "socket.so";
import { Buffer } from "./buffer.js";
var BufferObject = new Buffer();

var data_cb = null;
var error_cb = null;
var gdata_buf = BufferObject.alloc(1024);

function read_uart(sock) 
{		
	var total = 0;
	try
	{		
		total = os.read(sock, gdata_buf.buffer,0,gdata_buf.length);
	}
	catch (e)
	{
		console.log("read error: " + e);
		return;
	}
	if (total > 0)
	{
		if (data_cb)
		{
			//console.log("->recv ok: " + total);
			data_cb(gdata_buf.slice(0, total));
		}
		else{
			console.log("->recv no cb: " + total);
		}
	}
	else if (total == 0)
	{	
		if(error_cb)error_cb();
		console.log("read fail: uart closed" );
	}
	else{
		console.log("read fail: " + total);
		return;
	}
	
}

function uart_read_cb(sock) {
	read_uart(sock);	
}


function openUart(dev, b)
{
	var rv;
	var uartFd;

	uartFd = os.open(dev, os.O_RDWR);
	if (uartFd < 0)
	{
		console.log("Open UART FAILED");
		return;
	}
	console.log("open result: " + uartFd);
	rv = net.setUart(uartFd,b,8,'N',1);
	console.log("setUart result: " + rv);
	rv = net.nonblock(uartFd);

	read_uart(uartFd);
	console.log("nonblock result: " + rv);
	os.setReadHandler(uartFd, uart_read_cb);
	return uartFd;
}


export class SerialPort {
  constructor(path, options) {
	this.path = path;
	this.options = options;
	this._fd = -1;
	this.isOpen = false;
	error_cb = this.close.bind(this);
  } 

  open(cb){
	  var b = net.B9600;
	  if ((typeof this.options.baudRate) !== 'undefined')
	  {
		  b = this.options.baudRate;
	  }
	 this._fd = openUart(this.path, b);
	 if (this._fd < 0)
	 {
		 cb('Open Failed');
	 }
	 else{
		 this.isOpen = true;
		 console.log("open Okey!!");
		 cb();
	 }
  }

  write(data){
	var total = os.write(this._fd, data.buffer,0,data.length);
	if (total != data.length)
	{
		console.log("write uart failed: " + total);
		//return;
	}
	else{
		//console.log("uart write ok: " );
		//console.log(data);
	}
  }

  close(cb){
	if (this._fd !== -1)
	{
		os.setReadHandler(this._fd, null);
		os.close(this._fd);
		this._fd = -1;
		this.isOpen = false;
	}
	if(cb)cb();
	console.log("closed!!");
  }

  on(event, cb){
	  if (event === 'data')
	  {
		data_cb = cb.bind(this);
	  }
	  else{
	  }
  }
}


