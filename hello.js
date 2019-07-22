import * as RaftLink from "raftlink.so";
import * as utils from "../res/utils.js";
import * as homekit from "../res/hap.js";

/*
通讯协议仿绿米API
https://github.com/lumi-openlcoud/opencloud-docs/blob/master/zh/docs/development/gateway-LAN-communication.md
*/
const  PRODUCT_MODEL = "qjs.raftlink";
const  PRODUCT_ID = "helloid";

var iamCmd = { cmd:"iam", ip:"192.168.19.1",  
		 sid:PRODUCT_ID, protocal:"v2", 
		 model: PRODUCT_MODEL};

var discRspCmd = { cmd:"discovery_rsp",   
		 sid : PRODUCT_ID, dev_list:[], 
		 model : PRODUCT_MODEL};

var switchDev = {sid:"12345", 
	model: "plug.aq2",
	manufacturer: "QuickJS",
	product: "RaftLink JS Plug",
	name: "JS Plug"};
discRspCmd.dev_list.push(switchDev);

var readRspCmd = {
	cmd: "read_rsp",
	sid:"12345", 
	model: "plug.aq2",
	params:[{"channel_0":"on"}] 
};

var writeRspCmd = {
	cmd: "write_rsp",
	sid:"12345", 
	model: "plug.aq2",
	params:[{"channel_0":"on"}] 
};

var retryInterval= null;

/*断开重连*/
function  homekitRetryCb(){
    console.log("homekitRetryCb call");
	homekit.open(function(result){
		if (result == 'ok')
		{
			homekit.send(iamCmd);
			//os.clearTimeout(retryInterval);
			retryInterval = null;
		}
		else{
			console.log("result error: " + result);
			retryInterval = os.setTimeout(5000, homekitRetryCb);
		}
	});

};

homekit.setError(function(err){
	console.log("HAP Error happend!!");
	if (retryInterval === null)
	{
		retryInterval = os.setTimeout(5000, homekitRetryCb);
	}
});

/*响应HOMEHUB请求*/
homekit.requestEvent(function(e){
	if (!e.cmd)
	{
		console.log("HAP Error EVENT: ", e);
		return;
	}
	switch (e.cmd)
	{
		case 'discovery':
			homekit.send(discRspCmd);
		break;
		case 'read':
			homekit.send(readRspCmd);
		break;
		case 'write':
			writeRspCmd.params[0].channel_0 = e.params[0].channel_0;
			readRspCmd.params[0].channel_0 = e.params[0].channel_0;
			homekit.send(writeRspCmd);
		break;	
		default:
			console.log("unknow HAP event: " + e.cmd);
		break;
	}
});

/*发起HOMEHUB连接通讯*/
homekit.open(function(result){
	if (result == 'ok')
	{
		/*成功*/
		homekit.send(iamCmd);
	}
	else{
		console.log("result error: " + result);
	}
});

/*创建WEB控制接口*/
RaftLink.createUI('mykey1', 'link',
	'http://iot.wifi-town.com/', 'Link From JS');

RaftLink.createUI('mykey2', 'boolean',
	'1', 'Button From JS');

RaftLink.createUI('mykey3', 'string_temp',
	'Label From JS', 'JS Tips');

RaftLink.createUI('mykey4', 'qrcode',
	'Qr From JS', 'JS QRCODE');


console.log("set global key1 value: " + mykey1);
console.log("set global key2 value: " + mykey2);
console.log("set global key3 value: " + mykey3);
console.log("set global key4 value: " + mykey4);

/*响应WEB控制事件消息*/
RaftLink.onEvent('webui',function(msg, code){
	console.log("Web Event key: " + msg);
	console.log("Element value: " + code);
});

RaftLink.onEvent('bus',function(msg){
	console.log("Bus Event");
});

/*ubus calling*/
RaftLink.busCall('system','info','{}', function(msg){
	console.log("uBus system info result: " + msg);
});

RaftLink.busCall('system','board','{}', function(msg){
	console.log("uBus system board result: " + msg);
});
