/*  */

import * as fs from "../res/fs.js";
import * as jf from "../res/jsonfile.js";


console.log("scriptConfigFile: " + scriptConfigFile);
if (fs.existsSync('/etc/passwd')) {
  console.log('The file1 exists.');
}




var ret;
try {
  ret = fs.accessSync('etc/passwd', os.R_OK | os.W_OK);
  console.log('can read/write1 ' + ret);
  ret = fs.accessSync('opt/123', os.R_OK | os.W_OK);
  console.log('can read/write2 ' + ret);
} catch (err) {
  console.log('no access!',err);
}

var myDir = '/tmp/folder';
if (fs.existsSync(myDir)) {
	var st = fs.fstatSync(myDir);
	if ((st.st_mode & os.S_IFDIR) == os.S_IFDIR)
	{
		console.log("fstat dir okey: ", JSON.stringify(st));	
	}
	else{
		console.log("fstat error: ", JSON.stringify(st));	
	}
	fs.rmdirSync(myDir);
}
else{
	fs.mkdirSync("/tmp/folder", 438);
}

try
{
	var st = fs.fstatSync("/www/index1.html");
	console.log("fstatSync: ", JSON.stringify(st));	
}
catch (err)
{
	console.log("--Error--", err);
}


fs.unlinkSync("/tmp/wifi.log");

//console.log("go read file1");
var data = fs.readFileSync('/tmp/seniverse.json', 'utf8');
console.log("--1-------");
console.log(data);


//var path = '/tmp/jf.json';

if (fs.existsSync(scriptConfigFile) == false) {
  console.log('The file '+scriptConfigFile+' not exists.');
  var hello_jf = {a:true,b:'OK',c: 12.11};
  hello_jf.now = Math.round(new Date().getTime()/1000);
  jf.writeFileSync(scriptConfigFile, hello_jf);
  console.log("ok write file");
}

try
{
	var hello2_jf = jf.readFileSync(scriptConfigFile);
	console.log('jf read:', JSON.stringify(hello2_jf) );
}
catch (e)
{
	console.log("error read file" + e);
}
fs.chmodSync(scriptConfigFile, 438);
