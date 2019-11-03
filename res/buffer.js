
import { FastBuffer } from "./fastBuf.js";

const assertSize = ((size) => {
  if (typeof size !== 'number') {
    //throw new ERR_INVALID_ARG_TYPE('size', 'number', size);
  }
  //if (!(size >= 0 && size <= kMaxLength)) {
    //throw new ERR_INVALID_OPT_VALUE.RangeError('size', size);
  //}
});


const zeroFill = [0];

function createUnsafeBuffer(size) {
  zeroFill[0] = 0;
  try {
    return new FastBuffer(size);
  } finally {
    zeroFill[0] = 1;
  }
}


export class Buffer extends FastBuffer {

	constructor(props) {
		super(props);
		this.poolSize = 8 * 1024;		
		this.createPool();
		//console.log("Buffer go params");
	}

	createPool() {
	  var poolSize = this.poolSize;
	  this.allocPool = createUnsafeBuffer(poolSize).buffer;
	  this.poolOffset = 0;
	}

	alignPool() {
	  // Ensure aligned slices
	  if (this.poolOffset & 0x7) {
		this.poolOffset |= 0x7;
		this.poolOffset++;
	  }
	}

	allocate(size) {
	  if (size <= 0) {
		return new FastBuffer();
	  }
	  if (size < (this.poolSize >>> 1)) {
		if (size > (this.poolSize - this.poolOffset))
		  this.createPool();
		const b = new FastBuffer(this.allocPool, this.poolOffset, size);
		this.poolOffset += size;
		this.alignPool();
		//console.log("b1 size: " + size);
		//console.log("b2 size: " + b.length);
		return b;
	  }
	  return createUnsafeBuffer(size);
	}

	allocUnsafe(size) {
	  assertSize(size);
	  return this.allocate(size);
	};

	alloc(size, fill, encoding) {
		//console.log("alloc size: " + size);
	  assertSize(size);
	  
	  if (fill !== undefined && fill !== 0 && size > 0) {
		const buf = createUnsafeBuffer(size);
		console.log("alloc1 size: " + size);
		return buf;//_fill(buf, fill, 0, buf.length, encoding);
	  }
	  //console.log("alloc2 size: " + size);
	  return new FastBuffer(size);
	};

	from(value, encodingOrOffset, length) {
		console.log("from size error: " + length);
	  /*if (typeof value === 'string')
		return fromString(value, encodingOrOffset);

	  if (typeof value === 'object' && value !== null) {
		if (isAnyArrayBuffer(value))
		  return fromArrayBuffer(value, encodingOrOffset, length);

		const valueOf = value.valueOf && value.valueOf();
		if (valueOf !== null && valueOf !== undefined && valueOf !== value)
		  return Buffer.from(valueOf, encodingOrOffset, length);

		const b = fromObject(value);
		if (b)
		  return b;

		if (typeof value[Symbol.toPrimitive] === 'function') {
		  return Buffer.from(value[Symbol.toPrimitive]('string'),
							 encodingOrOffset,
							 length);
		}
	  }

	  throw new ERR_INVALID_ARG_TYPE(
		'first argument',
		['string', 'Buffer', 'ArrayBuffer', 'Array', 'Array-like Object'],
		value
	  );*/
   }


}

Buffer.prototype.concat = function concat(buf) {
  var size = 0;
  for (var i=0; i<buf.length; i++)
  {
	  size += buf[i].byteLength;
  }
  var tmp = new FastBuffer(size);
  var offset = 0;
  for (var i=0; i<buf.length; i++)
  {
	  if (buf[i].byteLength === 0)
	  {
		  continue;
	  }
	  tmp.set(new FastBuffer(buf[i]), offset);
	  offset += buf[i].byteLength;
  }

  //tmp.set(new Uint8Array(buffer1), 0);
 // tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

Buffer.prototype.toJSON = function toJSON() {
  if (this.length > 0) {
    const data = new Array(this.length);
    for (var i = 0; i < this.length; ++i)
      data[i] = this[i];
    return { type: 'Buffer', data };
  }
  return { type: 'Buffer', data: [] };
};

function adjustOffset(offset, length) {
  // Use Math.trunc() to convert offset to an integer value that can be larger
  // than an Int32. Hence, don't use offset | 0 or similar techniques.
  offset = Math.trunc(offset);
  if (offset === 0) {
    return 0;
  }
  if (offset < 0) {
    offset += length;
    return offset > 0 ? offset : 0;
  }
  if (offset < length) {
    return offset;
  }
  return Number.isNaN(offset) ? 0 : length;
}

Buffer.prototype.slice = function slice(start, end) {
  const srcLength = this.length;
  start = adjustOffset(start, srcLength);
  end = end !== undefined ? adjustOffset(end, srcLength) : srcLength;
  const newLength = end > start ? end - start : 0;
  return new FastBuffer(this.buffer, this.byteOffset + start, newLength);
};

function swap(b, n, m) {
  const i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16() {
  // For Buffer.length < 128, it's generally faster to
  // do the swap in javascript. For larger buffers,
  // dropping down to the native code is faster.
  const len = this.length;
  if (len % 2 !== 0)
    throw new Error('16-bits');
  if (len < 128) {
    for (var i = 0; i < len; i += 2)
      swap(this, i, i + 1);
    return this;
  }
  return _swap16(this);
};

Buffer.prototype.swap32 = function swap32() {
  // For Buffer.length < 192, it's generally faster to
  // do the swap in javascript. For larger buffers,
  // dropping down to the native code is faster.
  const len = this.length;
  if (len % 4 !== 0)
    throw new Error('32-bits');
  if (len < 192) {
    for (var i = 0; i < len; i += 4) {
      swap(this, i, i + 3);
      swap(this, i + 1, i + 2);
    }
    return this;
  }
  return _swap32(this);
};

Buffer.prototype.swap64 = function swap64() {
  // For Buffer.length < 192, it's generally faster to
  // do the swap in javascript. For larger buffers,
  // dropping down to the native code is faster.
  const len = this.length;
  if (len % 8 !== 0)
    throw new Error('64-bits');
  if (len < 192) {
    for (var i = 0; i < len; i += 8) {
      swap(this, i, i + 7);
      swap(this, i + 1, i + 6);
      swap(this, i + 2, i + 5);
      swap(this, i + 3, i + 4);
    }
    return this;
  }
  return _swap64(this);
};

/////////////



// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill(value, offset, end, encoding) {
  return _fill(this, value, offset, end, encoding);
};

function _fill(buf, value, offset, end, encoding) {
  if (typeof value === 'string') {
    if (offset === undefined || typeof offset === 'string') {
      encoding = offset;
      offset = 0;
      end = buf.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = buf.length;
    }

    const normalizedEncoding = normalizeEncoding(encoding);
    if (normalizedEncoding === undefined) {
      validateString(encoding, 'encoding');
      throw new Error(encoding);
    }

    if (value.length === 0) {
      // If value === '' default to zero.
      value = 0;
    } else if (value.length === 1) {
      // Fast path: If `value` fits into a single byte, use that numeric value.
      if (normalizedEncoding === 'utf8') {
        const code = value.charCodeAt(0);
        if (code < 128) {
          value = code;
        }
      } else if (normalizedEncoding === 'latin1') {
        value = value.charCodeAt(0);
      }
    }
  } else {
    encoding = undefined;
  }

  if (offset === undefined) {
    offset = 0;
    end = buf.length;
  } else {
    validateInt32(offset, 'offset', 0);
    // Invalid ranges are not set to a default, so can range check early.
    if (end === undefined) {
      end = buf.length;
    } else {
      validateInt32(end, 'end', 0, buf.length);
    }
    if (offset >= end)
      return buf;
  }

  const res = bindingFill(buf, value, offset, end, encoding);
  if (res < 0) {
    if (res === -1)
      throw new Error('value: ' + value);
    throw new Error('ERR_BUFFER_OUT_OF_BOUNDS');
  }

  return buf;
}


////////
export function isBuffer(b) {
  return b instanceof Buffer;
};

export function isFastBuffer(b) {
  return b instanceof FastBuffer;
};


export function concatBuffer(buf) {
  var size = 0;
  for (var i=0; i<buf.length; i++)
  {
	  size += buf[i].byteLength;
  }
  var tmp = new FastBuffer(size);
  var offset = 0;
  for (var i=0; i<buf.length; i++)
  {
	  if (buf[i].byteLength === 0)
	  {
		  continue;
	  }
	  tmp.set(new FastBuffer(buf[i]), offset);
	  offset += buf[i].byteLength;
  }
  return tmp;
};



