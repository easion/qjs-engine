import * as m_fs from "./fs.js";
import * as utils from "./utils.js";


export function readFileSync (file, options) {
  options = options || {}
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  const fs = options.fs || m_fs

  let shouldThrow = true
  if ('throws' in options) {
    shouldThrow = options.throws
  }

  if (!options.encoding)
  {
	  options.encoding = 'utf8';
  }
  if (!options.flag)
  {
	  options.flag = 'r';
  }

  try {
    let content = fs.readFileSync(file, options)
	console.log("content: ", content);
    content = stripBom(content)
    return JSON.parse(content, options.reviver)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`
      throw err
    } else {
      return null
    }
  }
}

function stringify (obj, options) {
  let spaces
  let EOL = '\n'
  if (typeof options === 'object' && options !== null) {
    if (options.spaces) {
      spaces = options.spaces
    }
    if (options.EOL) {
      EOL = options.EOL
    }
  }

  const str = JSON.stringify(obj, options ? options.replacer : null, spaces)
  return str.replace(/\n/g, EOL) + EOL
}


export function writeFileSync (file, obj, options) {
  options = options || {}
  const fs = options.fs || m_fs

  const str = stringify(obj, options)
  // not sure if fs.writeFileSync returns anything, but just in case
  return fs.writeFileSync(file, str, options)
}



function stripBom (content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (utils.isUint8Buffer(content)) {
	  content = utils.decodeUtf8(content);
  }
  content = content.replace(/^\uFEFF/, '')
  return content
}


