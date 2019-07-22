/*
run command:
npm install
node sample.js 
*/

import * as Mqtt from "mqtt.so";
import * as utils from "../res/utils.js";

var mqttParam = {
    server: 'tcp://fuhai.gw:1883',
    options: {
		//protocolId: 'MQIsdp',
		//protocolVersion: 3,
        username: 'your_username',
        password: 'your_password',
        clientId: 'RaftLink_API' 
    },
    sub_topic: 'rltele/+/v1' //侦听所有设备的消息
};


console.log(`mosquitto : ${Mqtt.version()}`);
console.log(`scriptArgs : ${scriptArgs}`);


var mqttClient = Mqtt.connect(mqttParam.server, mqttParam.options);
console.log('Connecting to broker: ' + mqttParam.server);

/*
  发现子设备列表
*/
function doDiscovery(device_id) {
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();
	
	body.msg = 'DISCOVERY';
	body.time = d+'';
	//console.log("Pub DISCOVERY: " + topic);
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false})
}

/*
  查询单个子设备信息
*/
function doQuery(device_id, aid) {
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();
	
	body.msg = 'GET-STATE';
	body.time = d+'';
	body.aid = Number(aid);
	body.seq = 122;
	console.log("Pub GET-STATE: " + JSON.stringify(body));
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false})
}

/*
  设置子设备开关量
*/
 function setSwitch(device_id, aid, value){
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();

	body.msg = 'SET-STATE';
	body.time = d+'';
	body.aid = Number(aid);
	body.seq = 1;
	if (value == true)
	{
		body.power = 'on';
	}
	else{
		body.power = 'off';
	}
	//console.log("Pub SET-STATE: " + topic);
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false});		
}
/*
  设置LED灯子设备亮度, value范围0-100
*/
function setBrightness(device_id, aid, value){
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();

	body.msg = 'SET-STATE';
	body.time = d+'';
	body.aid = Number(aid);
	body.seq = 2;		
	body.brightness = value;
	
	//console.log("Pub SET-STATE: " + topic);
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false});		
}
/*
  设置LED灯子设备色温, value范围0-100
*/
function setColorTemperature(device_id,aid, value){
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();

	body.msg = 'SET-STATE';
	body.time = d+'';
	body.aid = Number(e.currentTarget.id);
	body.seq = 3;		
	body.ct = e.detail.value;
	
	//console.log("Pub SET-STATE: " + topic);
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false});		
}
/*
  设置LED灯子设备色调, value范围0-100
*/
function setHue(device_id, aid, value){
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();

	body.msg = 'SET-STATE';
	body.time = d+'';
	body.aid = Number(aid);
	body.seq = 4;		
	body.hue = value;
	
	//console.log("Pub SET-STATE: " + topic);
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false});		
}
/*
  设置LED灯子设备饱和度, value范围0-100
*/
function setSaturation(device_id, aid, value){
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();		

	body.msg = 'SET-STATE';
	body.time = d+'';
	body.aid = Number(aid);
	body.seq = 5;		
	body.saturation = value;
	
	//console.log("Pub SET-STATE: " + topic);
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false});		
}
	

/*
  获取设备的DHCP客户端信息列表
*/   
function requestDhcpClients(device_id) {
	var body = {};
	var topic = 'rlcommand/'+device_id+'/v1';
	var d = new Date().getTime();		

	body.msg = 'DHCP-REQUEST';
	body.time = d+'';		
	
	console.log("Pub DHCP-REQUEST: " +  JSON.stringify(body));
	mqttClient.publish(topic, JSON.stringify(body), {qos: 1, retain: false});
}



mqttClient.on('error', function(error) {
    console.error(error);
});

mqttClient.on('message', function(topic, data) {
    console.log('MQTT topic: ' + topic);
	var str = utils.decodeUtf8(data);
    console.log('  data received: ' + str);
   //if (data.toString() === 'exit') process.exit();
   mqttClient.close();
});

mqttClient.on('pubmid', function(topic, data) {
    console.log('MQTT mid: ' + topic);
    console.log('  msg received: ' + data);
    //if (data.toString() === 'exit') process.exit();
});


mqttClient.on('connect', function() {
    console.log('Connected. Client id is: ' + mqttParam.options.clientId);

    mqttClient.subscribe(mqttParam.sub_topic);
    console.log('Subscribed to topic: ' + mqttParam.sub_topic)

	doDiscovery('eg57447');
	doQuery('eg57447',2);
	requestDhcpClients('eg57447');

    //mqttClient.publish(mqttParam.pub_topic, 'Message from Baidu IoT demo');
    //console.log('MQTT message published.');
});
