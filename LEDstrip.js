/*
light:
  - platform: mqtt
    name: "彩色灯带"
    state_topic: "/LEDstrip/relay/0"
    command_topic: "/LEDstrip/relay/0/set"
    payload_on: 1
    payload_off: 0
    brightness_state_topic: "/LEDstrip/brightness"
    brightness_command_topic:  "/LEDstrip/brightness/set"
    rgb_state_topic: "/LEDstrip/color"
    rgb_command_topic: "/LEDstrip/color/set"    
   - platform: mqtt     name: "test_led"     
    state_topic: "hachina/hardware/led01/state"    
    command_topic: "hachina/hardware/led01/switch"     
    payload_on: "on"     
    payload_off: "off"
*/

import * as Mqtt from "mqtt.so";
import * as utils from "../res/utils.js";
import * as homekit from "../res/hap.js";

var mqttParam = {
    server: 'tcp://fuhai.gw:1883',
    options: {
		//protocolId: 'MQIsdp',
		//protocolVersion: 3,
        username: 'your_username',
        password: 'your_password',
        clientId: 'RaftLink_API' 
    }
    //sub_topic: 'rltele/+/v1' //侦听所有设备的消息
};

const command_topic = "/LEDstrip/relay/0/set";
const brightness_command_topic =  "/LEDstrip/brightness/set";
const rgb_command_topic = "/LEDstrip/color/set";

console.log(`mosquitto : ${Mqtt.version()}`);
console.log(`scriptArgs : ${scriptArgs}`);



/*
通讯协议仿绿米API
https://github.com/lumi-openlcoud/opencloud-docs/blob/master/zh/docs/development/gateway-LAN-communication.md
*/
const  PRODUCT_MODEL = "qjs.LEDstrip";
const  PRODUCT_ID = "LEDbulb0";

var iamCmd = { cmd:"iam", ip:"192.168.19.1",  
		 sid:PRODUCT_ID, protocal:"v2", 
		 model: PRODUCT_MODEL};

var discRspCmd = { cmd:"discovery_rsp",   
		 sid : PRODUCT_ID, dev_list:[], 
		 model : PRODUCT_MODEL, 
	join_state: false /*入网模式*/};

var switchDev = {sid:"12345", 
	model: "light_zll.temp",
	manufacturer: "QuickJS",
	product: "WiFi lightbulbs",
	name: "LEDbulb"};
discRspCmd.dev_list.push(switchDev);

var readRspCmd = {
	cmd: "read_rsp",
	sid:"12345", 
	model: "light_zll.temp",
	params:[{"channel_0":"on", "brightness": 128}] 
};

var writeRspCmd = {
	cmd: "write_rsp",
	sid:"12345", 
	model: "light_zll.temp",
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
			retryInterval = os.setTimeout(homekitRetryCb, 5000);
		}
	});

};

homekit.setError(function(err){
	console.log("HAP Error happend!!");
	if (retryInterval === null)
	{
		retryInterval = os.setTimeout(homekitRetryCb, 5000);
	}
});

/*响应HOMEHUB请求*/
homekit.requestEvent(function(e){
	if (!e.cmd)
	{
		console.log("HAP Error EVENT: ", e);
		return;
	}
	if (e.sid === undefined)
	{
		console.log("HAP No sid param!");
		return;
	}
	console.log("HAP Recveive:" + JSON.stringify(e));
	switch (e.cmd)
	{
		case 'discovery':
			homekit.send(discRspCmd);
		break;
		case 'read':
			homekit.send(readRspCmd);
		break;
		case 'join':
			/*入网请求*/
			if (e.join_state === true)
			{
			}
			else{
			}
			break;
		case 'write':
			if (!e.params || e.params.length < 1)
			{
				console.log("Error params");
				return;
			}
			if (e.params[0].channel_0 !== undefined)
			{
				if (e.params[0].channel_0 === 'on')
				{
					setSwitch(e.sid, true);
				}
				else{
					setSwitch(e.sid, false);
				}
				readRspCmd.params[0].channel_0 = e.params[0].channel_0;
				writeRspCmd.params[0].channel_0  = readRspCmd.params[0].channel_0;
			}
			if (e.params[0].brightness !== undefined)
			{				
				setBrightness(e.sid, e.params[0].brightness);				
				readRspCmd.params[0].brightness = e.params[0].brightness;
				writeRspCmd.params[0].brightness  = readRspCmd.params[0].brightness;
			}
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



var mqttClient = Mqtt.connect(mqttParam.server, mqttParam.options);
console.log('Connecting to broker: ' + mqttParam.server);


/*
  设置子设备开关量
*/
 function setSwitch(sid, value){
	var body = '0';
	var topic = command_topic;
	
	if (value === true)
	{
		body = '1';
	}
	else{
		body = '0';
	}
	console.log("Pub SET-POWER: " + topic + " set " + body);
	mqttClient.publish(topic, body, {qos: 1, retain: false});		
}
/*
  设置LED灯子设备亮度, value范围0-255
*/
function setBrightness(sid,value){
	var topic = brightness_command_topic;	
	mqttClient.publish(topic, value+"", {qos: 1, retain: false});	
	console.log("Pub SET-BRIGHT: " + topic + " set " + value);
}


mqttClient.on('error', function(error) {
    console.error(error);
});

mqttClient.on('message', function(topic, data) {
    console.log('MQTT topic: ' + topic);
	var str = utils.decodeUtf8(data);
    console.log('  data received: ' + str);
	if (topic === '/LEDstrip/relay/0')
	{
		if (str === '1')
		{
			readRspCmd.params[0].channel_0 = 'on';
		}
		else{
			readRspCmd.params[0].channel_0 = 'off';
		}
	}
	else if (topic === '/LEDstrip/brightness')
	{
		readRspCmd.params[0].brightness = Number(str);
	}
	else{
		consloe.log("Receive unsupport topic: " + topic);
		if (str === 'exit') os.exit();
	}
   //mqttClient.close();
});

mqttClient.on('pubmid', function(topic, data) {
    console.log('MQTT mid: ' + topic);
    console.log('  msg received: ' + data);
});


mqttClient.on('connect', function() {
    console.log('Connected. Client id is: ' + mqttParam.options.clientId);

    mqttClient.subscribe('/LEDstrip/relay/0');
    mqttClient.subscribe('/LEDstrip/brightness');
    console.log('Subscribed topic Okey' );
});


