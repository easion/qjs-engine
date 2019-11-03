//import * as sys from "socket.so";

import { Buffer } from "./buffer.js";
import * as utils from "./utils.js";

var BufferObject = new Buffer();

function getValidatedPath(path)
{
	return path;
}
/*
const getValidatedPath = hideStackFrames((fileURLOrPath, propName = 'path') => {
  const path = toPathIfFileURL(fileURLOrPath);
  validatePath(path, propName);
  return path;
});
*/
export function accessSync(path, mode) {
  path = getValidatedPath(path);

  if (mode === undefined)
    mode = os.F_OK;
  else
    mode = mode | 0;

  //const ctx = { path };
  var ret = os.access(path);
  if (ret !== 0)
  {
	  throw new Error("Access failed");
	  return false;
  }
  //console.log("Access file OK " + path,ret);
  //handleErrorFromBinding(ctx);
  return true;
}

export function existsSync(path) {
  try {
    path = getValidatedPath(path);
  } catch {
    return false;
  }
  try
  {
	var ret = os.access(path, os.F_OK);
  }
  catch (e)
  {
	  console.log("existsSync error: " + e);
	  return false;
  }  
  return (ret === 0);
}

export function fstatSync(fd, options = {}) {
  //validateUint32(fd, 'fd');
  const stats = os.fstat(fd);
  //console.log("fstat file " + fd,stats);
  //handleErrorFromBinding(ctx);
  return stats;
}


export function unlinkSync(path) {
  path = getValidatedPath(path);
  var ret = os.remove(path);
  //console.log("rm file " + path,ret);
 // handleErrorFromBinding(ctx);
  return (ret === 0);
}

function isUint32(value) {
  return value === (value >>> 0);
}

function ERR_INVALID_ARG_VALUE(name, value, modeDesc)
{
	return {message: name};
}

function parseMode(value, name, def) {
  if (isUint32(value)) {
    return value;
  }

  if (typeof value === 'number') {
    //validateInt32(value, name, 0, 2 ** 32 - 1);
  }

  if (typeof value === 'string') {
    //if (!octalReg.test(value)) {
    //  throw new ERR_INVALID_ARG_VALUE(name, value, modeDesc);
    //}
    return parseInt(value, 8);
  }

  if (def !== undefined && value == null) {
    return def;
  }

  throw new Error("Error " + name+ value);
}


export function chmodSync(path, mode) {
  path = getValidatedPath(path);
  mode = parseMode(mode, 'mode');

  var ret = os.chmod(path, mode);
  console.log("chmodSync file " + path,ret);
  //handleErrorFromBinding(ctx);
  return (ret === 0);
}

export function rmdirSync(path) {
  path = getValidatedPath(path);

  var ret = -1;
  try
  {	
	ret = os.rmdir(path);
  }
  catch (e)
  {
	console.log("rmdirSync error " + e);
	return false;
  }
 // handleErrorFromBinding(ctx);
  return (ret === 0);
}

export function mknodSync(path,f,d) {
  path = getValidatedPath(path);
  var ret = os.mknod(path,f,d);
  //console.log("rmdirSync file " + path,ret);
  return (ret === 0);
 // handleErrorFromBinding(ctx);
}

export function mkdirSync(path, options) {
  if (typeof options === 'number' || typeof options === 'string') {
    options = { mode: options };
  }
  const {
    recursive = false,
    mode = 0o777
  } = options || {};

  path = getValidatedPath(path);
  if (typeof recursive !== 'boolean')
    throw new Error('recursive not boolean');

  var ret = -1;

  try
  {
  ret = os.mkdir(path, parseMode(mode, 'mode', 0o777));	
  }
  catch (e)
  {
	console.log("mkdirSync error " +e);
	return false;
  }

  //handleErrorFromBinding(ctx);
  return (ret === 0);
}


function stringToFlags(flags) {
  if (typeof flags === 'number') {
    return flags;
  }

  switch (flags) {
    case 'r' : return os.O_RDONLY;
    case 'rs' : // Fall through.
    case 'sr' : return os.O_RDONLY | os.O_SYNC;
    case 'r+' : return os.O_RDWR;
    case 'rs+' : // Fall through.
    case 'sr+' : return os.O_RDWR | os.O_SYNC;

    case 'w' : return os.O_TRUNC | os.O_CREAT | os.O_WRONLY;
    case 'wx' : // Fall through.
    case 'xw' : return os.O_TRUNC | os.O_CREAT | os.O_WRONLY | os.O_EXCL;

    case 'w+' : return os.O_TRUNC | os.O_CREAT | os.O_RDWR;
    case 'wx+': // Fall through.
    case 'xw+': return os.O_TRUNC | os.O_CREAT | os.O_RDWR | os.O_EXCL;

    case 'a' : return os.O_APPEND | os.O_CREAT | os.O_WRONLY;
    case 'ax' : // Fall through.
    case 'xa' : return os.O_APPEND | O_CREAT | os.O_WRONLY | os.O_EXCL;
    case 'as' : // Fall through.
    case 'sa' : return os.O_APPEND | os.O_CREAT | os.O_WRONLY | os.O_SYNC;

    case 'a+' : return os.O_APPEND | os.O_CREAT | os.O_RDWR;
    case 'ax+': // Fall through.
    case 'xa+': return os.O_APPEND | os.O_CREAT | os.O_RDWR | os.O_EXCL;
    case 'as+': // Fall through.
    case 'sa+': return os.O_APPEND | os.O_CREAT | os.O_RDWR | os.O_SYNC;
  }

  throw new Error('Error flags' + flags);
}


export function closeSync(fd) {
  //validateUint32(fd, 'fd');

  //console.log("close file "+fd);

  //const ctx = {};
  os.close(fd);
  //handleErrorFromBinding(ctx);
}

export function openSync(path, flags, mode) {
  path = getValidatedPath(path);
  const flagsNumber = stringToFlags(flags || 'r');
  mode = parseMode(mode, 'mode', 0o666);

  const result = os.open(path,
                              flagsNumber, mode);
  //os.seek(fd, os.SEEK_SET, position);
  //console.log("Open file "+path,result);
  //handleErrorFromBinding(ctx);
  return result;
}

function tryStatSync(fd, isUserFd) {
  //const ctx = {};
  const stats = os.fstat(fd);
  /*if (ctx.errno !== undefined && !isUserFd) {
    closeSync(fd);
    throw uvException(ctx);
  }*/
  return stats;
}


function tryCreateBuffer(size, fd, isUserFd) {
  let threw = true;
  let buffer;
  try {
    //if (size > kMaxLength) {
   //   throw new ERR_FS_FILE_TOO_LARGE(size);
    //}
    buffer = BufferObject.alloc(size);
    threw = false;
  } finally {
    if (threw && !isUserFd) {
		closeSync(fd);
	}
  }
  return buffer;
}

function readSync(fd, buffer, offset, length, position) {
  //validateUint32(fd, 'fd');
  //validateBuffer(buffer);

  offset |= 0;
  length |= 0;

  if (length === 0) {
    return 0;
  }

  if (buffer.byteLength === 0) {
    throw new ERR_INVALID_ARG_VALUE('buffer', buffer,
                                    'is empty and cannot be written');
  }

  //validateOffsetLengthRead(offset, length, buffer.byteLength);

  if (!Number.isSafeInteger(position))
    position = -1;

  if (position > 0)
  {
	  console.log("position: " + position);
	  os.seek(fd, os.SEEK_SET, position);
  }

 // const ctx = {};
  const result = os.read(fd, buffer.buffer, offset, length);
  //console.log("read result: " + result,  offset, length);
 // console.log("read buffer: ", buffer);
  //handleErrorFromBinding(ctx);
  return result;
}


function tryReadSync(fd, isUserFd, buffer, pos, len) {
  let threw = true;
  let bytesRead;
  try {
    bytesRead = readSync(fd, buffer, pos, len);
    threw = false;
  } finally {
    if (threw && !isUserFd) closeSync(fd);
  }
  return bytesRead;
}

const isFd = isUint32;

function getOptions(options, defaultOptions) {
  if (options === null || options === undefined ||
      typeof options === 'function') {
    return defaultOptions;
  }

  if (typeof options === 'string') {
    defaultOptions = { ...defaultOptions };
    defaultOptions.encoding = options;
    options = defaultOptions;
  } else if (typeof options !== 'object') {
    throw new ERR_INVALID_ARG_TYPE('options', ['string', 'Object'], options);
  }

  //if (options.encoding !== 'buffer')
   // assertEncoding(options.encoding);
  return options;
}

export function readFileSync(path, options) {
  options = getOptions(options, { flag: 'r' });
  const isUserFd = isFd(path); // File descriptor ownership
  const fd = isUserFd ? path : openSync(path, options.flag, 0o666);

  const stats = tryStatSync(fd, isUserFd);
  if ((stats.st_mode & os.S_IFREG) == os.S_IFREG)
  {
	//console.log("go read reg " + stats.st_mode);
  }
  else{	  
	  console.log("go read no reg " + stats.st_mode);
	  console.log("go read size " + stats.st_size);
  }

  //const size = isFileType(stats, S_IFREG) ? stats[8] : 0;
  const size = stats.st_size;
  let pos = 0;
  let buffer; // Single buffer with file data
  let buffers; // List for when size is unknown

  if (size === 0) {
    buffers = [];
  } else {
    buffer = tryCreateBuffer(size, fd, isUserFd);
  }

  let bytesRead;

  if (size !== 0) {
    do {
      bytesRead = tryReadSync(fd, isUserFd, buffer, pos, size - pos);
      pos += bytesRead;
    } while (bytesRead !== 0 && pos < size);
	
  } else {
	console.log("go read error size: " + size);
    do {
      // The kernel lies about many files.
      // Go ahead and try to read some bytes.
      buffer = BufferObject.allocUnsafe(8192);
      bytesRead = tryReadSync(fd, isUserFd, buffer, 0, 8192);
      if (bytesRead !== 0) {
        buffers.push(buffer.slice(0, bytesRead));
      }
      pos += bytesRead;
    } while (bytesRead !== 0);
  }

  if (!isUserFd)
    closeSync(fd);

  if (size === 0) {
    // Data was collected into the buffers list.
    buffer = Buffer.concat(buffers, pos);
  } else if (pos < size) {
    buffer = buffer.slice(0, pos);
  }

  if (options.encoding){
	  buffer = utils.decodeUtf8(buffer);
  }
  else{
	console.log("options: ", JSON.stringify(options));
  }
  return buffer;
}


////////////////////

function writeSync(fd, buffer, offset, length, position) {
  //validateUint32(fd, 'fd');
  //const ctx = {};
  let result;
  if (isArrayBufferView(buffer)) {
    if (position === undefined)
      position = null;
    if (typeof offset !== 'number')
      offset = 0;
    if (typeof length !== 'number')
      length = buffer.byteLength - offset;
    //validateOffsetLengthWrite(offset, length, buffer.byteLength);
	if (position)
	{
		os.seek(fd,os.SEEK_SET, position);
	}
    result = os.write(fd, buffer.buffer, offset, length);
  } else {
    if (typeof buffer !== 'string')
      buffer += '';
    if (offset === undefined)
      offset = null;
    //result = os.writeString(fd, buffer, offset, length,
    //                             undefined, ctx);
	result = 0;
  }
  //handleErrorFromBinding(ctx);
  return result;
}

const isArrayBufferView = ArrayBuffer.isView;

export function writeFileSync(path, data, options) {
  options = getOptions(options, { encoding: 'utf8', mode: 0o666, flag: 'w' });
  const flag = options.flag || 'w';

  const isUserFd = isFd(path); // File descriptor ownership
  const fd = isUserFd ? path : openSync(path, flag, options.mode);

  if (!isArrayBufferView(data)) {
	data = utils.encodeUTF8(data);
    //data = Buffer.from('' + data, options.encoding || 'utf8');
  }
  let offset = 0;
  let length = data.byteLength;
  let position = (/a/.test(flag) || isUserFd) ? null : 0;
  try {
    while (length > 0) {
      const written = writeSync(fd, data, offset, length, position);
	  if (written === 0)
	  {
		  break;
	  }
      offset += written;
      length -= written;
      if (position !== null) {
        position += written;
      }
    }
  } finally {
    if (!isUserFd) closeSync(fd);
  }
}

/*
*/

//export function writeFileSync(path, data, options) {
//}
