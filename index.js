/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../src/buffer-value.ts":
/*!******************************!*\
  !*** ../src/buffer-value.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BufferValue": () => (/* binding */ BufferValue),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../node_modules/@babel/runtime/helpers/esm/defineProperty.js");

const expIsPrintable = /^[^\x00-\x1F\x80-\x9F]$/i;
const int32 = {
  bytes: 4,
  signed: true,
  name: "int32",
  dtype: Int32Array
};
const float = {
  bytes: 4,
  signed: true,
  name: "float",
  dtype: Float32Array
};
const compat32 = {
  bytes: 4,
  signed: true,
  name: "compat32"
};
const uint32 = {
  bytes: 4,
  signed: false,
  name: "uint32",
  dtype: Uint32Array
};
const int64 = {
  bytes: 8,
  signed: true,
  name: "int64",
  dtype: BigInt64Array
};
const uint64 = {
  bytes: 8,
  signed: false,
  name: "uint64",
  dtype: BigUint64Array
};
const int8 = {
  bytes: 1,
  signed: true,
  name: "int8",
  dtype: Int8Array
};
const uint8 = {
  bytes: 1,
  signed: false,
  name: "uint8",
  dtype: Uint8Array
};
const int16 = {
  bytes: 2,
  signed: true,
  name: "int16",
  dtype: Int16Array
};
const uint16 = {
  bytes: 2,
  signed: false,
  name: "uint16",
  dtype: Uint16Array
};
const guid = {
  bytes: 4 * 4,
  signed: true,
  name: "guid"
};
const char = {
  bytes: NaN,
  signed: true,
  name: "char"
};
const utf16 = {
  bytes: NaN,
  signed: true,
  name: "utf16"
};
const decoderUTF16 = new TextDecoder("utf-16");
class BufferValue {
  static allocBytes(bytes) {
    return new BufferValue(Object.freeze({
      bytes: bytes,
      signed: true,
      name: "buffer"
    }));
  }
  constructor(type) {
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "bytes", void 0);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "type", void 0);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "endianess", "little");
    this.type = Object.assign({}, type);
    this.bytes = new DataView(new ArrayBuffer(isFinite(this.type.bytes) ? this.type.bytes : 0));
  }
  slice(start, end) {
    const child = new BufferValue(this.type);
    child.bytes = new DataView(this.bytes.buffer, start, end - start);
    return child;
  }
  readValue(buffer, offset) {
    if (buffer.byteLength <= offset + this.type.bytes) throw new Error("Out of bounds");
    let byteOffset = 0;
    if (this.type.name === "char") {
      const length = new BufferValue(uint8);
      length.readValue(buffer, offset);
      byteOffset = length.value > 0 ? length.type.bytes + 1 : 1;
      offset = offset + byteOffset - 1;
      this.type.bytes = length.value - 1;
    } else if (this.type.name === "compat32") {
      const byte = new BufferValue(uint8);
      let startOffset = offset;
      byte.readValue(buffer, offset);
      offset += byte.bytes.byteLength;
      let b = byte.bytes.getUint8(0);
      const sign = b & 0x80; // sign bit
      let shift = 6;
      let r = b & 0x3f;
      if (b & 0x40)
        // has 2nd byte
        {
          do {
            byte.readValue(buffer, offset);
            b = byte.bytes.getUint8(0);
            offset += byte.bytes.byteLength;
            r |= (b & 0x7F) << shift;
            shift += 7;
          } while (b & 0x80); // has more bytes
        }

      r = sign ? -r : r;
      this.bytes.setInt32(0, r, this.endianess === "little");
      return offset - startOffset;
    } else if (this.type.name === "utf16") {
      const length = new BufferValue(uint32);
      length.readValue(buffer, offset);
      byteOffset = length.type.bytes + 1;
      offset = offset + byteOffset - 1;
      this.type.bytes = length.value;
      this.type.bytes = this.type.bytes;
      byteOffset = byteOffset - 1;
    }
    this.bytes = new DataView(buffer.slice(offset, offset + this.type.bytes));
    return this.bytes.byteLength + byteOffset;
  }
  get string() {
    if (this.type.name === "utf16") {
      return decoderUTF16.decode(this.bytes.buffer /*.slice(3)*/);
    }

    let string = "";
    for (let i = 0, bc = this.bytes.byteLength; i < bc; i++) {
      const charCode = this.bytes.getUint8(this.bytes.byteOffset + i);
      const char = String.fromCharCode(charCode);
      string += char.match(expIsPrintable) ? char : ".";
    }
    return string;
  }
  set value(bytes) {
    if (typeof bytes === "number") {
      let funName = null;
      switch (this.type.name) {
        case "int64":
          funName = "setBigInt64";
          break;
        case "uint64":
          funName = "setBigUint64";
          break;
        case "int32":
          funName = "setInt32";
          break;
        case "float":
          funName = "setFloat32";
          break;
        case "uint32":
          funName = "setUint32";
          break;
        case "int16":
          funName = "setInt16";
          break;
        case "uint16":
          funName = "setUint16";
          break;
        case "int8":
          funName = "setInt8";
          break;
        case "uint8":
          funName = "setUint8";
          break;
        default:
          throw new Error(`Unknown type: ${this.type.name}`);
      }
      this.bytes[funName](this.bytes.byteOffset + 0, bytes, this.endianess === "little");
    } else throw new Error("Invalid action.");
  }
  get value() {
    const buffer = this.bytes;
    let funName = null;
    switch (this.type.name) {
      case "int64":
        funName = "getBigInt64";
        break;
      case "uint64":
        funName = "getBigUint64";
        break;
      case "compat32":
      case "int32":
        funName = "getInt32";
        break;
      case "float":
        funName = "getFloat32";
        break;
      case "uint32":
        funName = "getUint32";
        break;
      case "int8":
        funName = "getInt8";
        break;
      case "uint8":
        funName = "getUint8";
        break;
      case "int16":
        funName = "getInt16";
        break;
      case "uint16":
        funName = "getUint16";
        break;
      case "guid":
      case "char":
      case "utf16":
      case "buffer":
        break;
      default:
        throw new Error(`Unknown type: ${this.type.name}`);
    }
    if (funName) return buffer[funName](buffer.byteOffset, this.endianess === "little");else if (this.type.name === "guid") return this.bytes;else if (this.type.name === "char" || this.type.name === "utf16") return this.string;
    return this.bytes;
  }
  get hex() {
    if (this.type.name === "buffer" || this.type.name === "char") {
      if (this.bytes.byteLength === 1) return `0x${this.bytes.getUint8(this.bytes.byteOffset + 0)}`;
      let string = "0x";
      for (let i = 0; i < this.bytes.byteLength; i += 2) {
        const bits = this.bytes.getUint16(this.bytes.byteOffset + i, this.endianess === "little");
        const bitB = (bits >> 8 & 0xFF).toString(16).toUpperCase();
        const bitA = (bits & 0x00FF).toString(16).toUpperCase();
        string += (bitA.length === 1 ? `0${bitA}` : bitA) + (bitB.length === 1 ? `0${bitB}` : bitB);
      }
      return string;
    }
    const bits = this.toString(16).toUpperCase();
    const head = new Array(bits.length - this.type.bytes).fill("0").join("");
    return `0x${head}${bits}`;
  }
  toString(...args) {
    return this.value.toString(...args);
  }
}
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "uint64", uint64);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "int64", int64);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "compat32", compat32);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "uint32", uint32);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "int32", int32);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "int8", int8);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "uint8", uint8);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "int16", int16);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "uint16", uint16);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "guid", guid);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "char", char);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "utf16", utf16);
(0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(BufferValue, "float", float);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (BufferValue);


/***/ }),

/***/ "../node_modules/@babel/runtime/helpers/esm/defineProperty.js":
/*!********************************************************************!*\
  !*** ../node_modules/@babel/runtime/helpers/esm/defineProperty.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _defineProperty)
/* harmony export */ });
/* harmony import */ var _toPropertyKey_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./toPropertyKey.js */ "../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js");

function _defineProperty(obj, key, value) {
  key = (0,_toPropertyKey_js__WEBPACK_IMPORTED_MODULE_0__["default"])(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

/***/ }),

/***/ "../node_modules/@babel/runtime/helpers/esm/toPrimitive.js":
/*!*****************************************************************!*\
  !*** ../node_modules/@babel/runtime/helpers/esm/toPrimitive.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _toPrimitive)
/* harmony export */ });
/* harmony import */ var _typeof_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./typeof.js */ "../node_modules/@babel/runtime/helpers/esm/typeof.js");

function _toPrimitive(input, hint) {
  if ((0,_typeof_js__WEBPACK_IMPORTED_MODULE_0__["default"])(input) !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if ((0,_typeof_js__WEBPACK_IMPORTED_MODULE_0__["default"])(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}

/***/ }),

/***/ "../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js":
/*!*******************************************************************!*\
  !*** ../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _toPropertyKey)
/* harmony export */ });
/* harmony import */ var _typeof_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./typeof.js */ "../node_modules/@babel/runtime/helpers/esm/typeof.js");
/* harmony import */ var _toPrimitive_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./toPrimitive.js */ "../node_modules/@babel/runtime/helpers/esm/toPrimitive.js");


function _toPropertyKey(arg) {
  var key = (0,_toPrimitive_js__WEBPACK_IMPORTED_MODULE_1__["default"])(arg, "string");
  return (0,_typeof_js__WEBPACK_IMPORTED_MODULE_0__["default"])(key) === "symbol" ? key : String(key);
}

/***/ }),

/***/ "../node_modules/@babel/runtime/helpers/esm/typeof.js":
/*!************************************************************!*\
  !*** ../node_modules/@babel/runtime/helpers/esm/typeof.js ***!
  \************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _typeof)
/* harmony export */ });
function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!***********************!*\
  !*** ../src/index.ts ***!
  \***********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BufferValue": () => (/* reexport safe */ _buffer_value__WEBPACK_IMPORTED_MODULE_0__.BufferValue)
/* harmony export */ });
/* harmony import */ var _buffer_value__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./buffer-value */ "../src/buffer-value.ts");

})();

/******/ })()
;
//# sourceMappingURL=index.js.map