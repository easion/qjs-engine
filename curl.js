/* 
API Like:
https://github.com/JCMais/node-libcurl
*/
import * as CURL from "curl.so";
import * as utils from "../res/utils.js";

console.log(`curl version: ${CURL.version()}`);
//console.log(`curl versionInfo: ${JSON.stringify(CURL.versionInfo())}`);

var headers = [
    'Content-type: application/xml',
    'Authorization: gfhjui',
];

var url = 'https://api.seniverse.com/v3/weather/now.json?key=cwe2cszx82jkqxmv&location=guangzhou';
var client = CURL.open(url);

client.setOpt(CURL.VERBOSE, true)
//client.setOpt(CURL.POSTFIELDS, JSON.stringify(data))
client.setOpt(CURL.HTTPGET, 1)
client.setOpt(CURL.URL, url)
client.setOpt(CURL.CONNECTTIMEOUT, 5)
client.setOpt(CURL.HTTPHEADER, headers)
client.setOpt(CURL.SSL_VERIFYPEER, 0)
client.setOpt(CURL.SSL_VERIFYHOST, 2)


var full_data = null ;
client.on('data', (chunk) => {
	if (full_data == null)
	{
		full_data = chunk;
	}
	else{
		full_data += chunk;
	}
  console.log('Receiving data with size: ' + (typeof chunk))
  //console.log('Receiving data with data: ' + decodeUtf8(chunk))
})

client.on('header', (sz, chunk) => {
  console.log('Receiving headers with size: ', sz)
  console.log('Receiving headers with data: ', chunk)
})

function complete_cb(statusCode, body)  {
	console.log("curl completed!"); 
  if (statusCode !== 200)
  {
	  console.log('received http state:')
	  console.log(statusCode);
	  return;
  }
  console.log('Body received from http:')
  console.log(body);

  var str = utils.decodeUtf8(full_data);
  var json = JSON.parse(str);

  console.log('Receiving data all: ' + str)
  console.log('Receiving data name: ' + json.results[0].location.name)

  //client.close();
}

//client.on('end', complete_cb);

client.on('error', function(error, msg){
	console.log("Error happend" + error, msg);
});



os.setTimeout(function () {
	client.close(); //等待完成,否则会被JS垃圾回收
    console.log("timeout completed"); 
}, 10000 ); 

console.log('start perform')
client.perform(complete_cb);

