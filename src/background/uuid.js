/**
* UUID.js - RFC-compliant UUID Generator for JavaScript
*
* @file
* @author  LiosK
* @version v4.0.3
* @license Apache License 2.0: Copyright (c) 2010-2017 LiosK
*/

/**
* @class
* @classdesc {@link UUID} object.
* @hideconstructor
*/
var UUID;

UUID = (function(overwrittenUUID) {
"use strict";

// Core Component {{{

/**
* Generates a version 4 UUID as a hexadecimal string.
* @returns {string} Hexadecimal UUID string.
*/
UUID.generate = function() {
var rand = UUID._getRandomInt, hex = UUID._hexAligner;
return  hex(rand(32), 8)          // time_low
+ "-"
+ hex(rand(16), 4)          // time_mid
+ "-"
+ hex(0x4000 | rand(12), 4) // time_hi_and_version
+ "-"
+ hex(0x8000 | rand(14), 4) // clock_seq_hi_and_reserved clock_seq_low
+ "-"
+ hex(rand(48), 12);        // node
};

/**
* Returns an unsigned x-bit random integer.
* @private
* @param {number} x Unsigned integer ranging from 0 to 53, inclusive.
* @returns {number} Unsigned x-bit random integer (0 <= f(x) < 2^x).
*/
UUID._getRandomInt = function(x) {
if (x < 0 || x > 53) { return NaN; }
var n = 0 | Math.random() * 0x40000000; // 1 << 30
return x > 30 ? n + (0 | Math.random() * (1 << x - 30)) * 0x40000000 : n >>> 30 - x;
};

/**
* Converts an integer to a zero-filled hexadecimal string.
* @private
* @param {number} num
* @param {number} length
* @returns {string}
*/
UUID._hexAligner = function(num, length) {
var str = num.toString(16), i = length - str.length, z = "0";
for (; i > 0; i >>>= 1, z += z) { if (i & 1) { str = z + str; } }
return str;
};

/**
* Retains the value of 'UUID' global variable assigned before loading UUID.js.
* @since 3.2
* @type {any}
*/
UUID.overwrittenUUID = overwrittenUUID;

// }}}

// Advanced Random Number Generator Component {{{

(function() {

var mathPRNG = UUID._getRandomInt;

/**
* Enables Math.random()-based pseudorandom number generator instead of cryptographically safer options.
* @since v3.5.0
* @deprecated This method is provided only to work around performance drawbacks of the safer algorithms.
*/
UUID.useMathRandom = function() {
UUID._getRandomInt = mathPRNG;
};

var crypto = null, cryptoPRNG = mathPRNG;
if (typeof window !== "undefined" && (crypto = window.crypto || window.msCrypto)) {
if (crypto.getRandomValues && typeof Uint32Array !== "undefined") {
// Web Cryptography API
cryptoPRNG = function(x) {
if (x < 0 || x > 53) { return NaN; }
var ns = new Uint32Array(x > 32 ? 2 : 1);
ns = crypto.getRandomValues(ns) || ns;
return x > 32 ? ns[0] + (ns[1] >>> 64 - x) * 0x100000000 : ns[0] >>> 32 - x;
};
}
} else if (typeof require !== "undefined" && (crypto = require("crypto"))) {
if (crypto.randomBytes) {
// nodejs
cryptoPRNG = function(x) {
if (x < 0 || x > 53) { return NaN; }
var buf = crypto.randomBytes(x > 32 ? 8 : 4), n = buf.readUInt32BE(0);
return x > 32 ? n + (buf.readUInt32BE(4) >>> 64 - x) * 0x100000000 : n >>> 32 - x;
};
}
}
UUID._getRandomInt = cryptoPRNG;

})();

// }}}

// UUID Object Component {{{

/**
* Names of UUID internal fields.
* @type {string[]}
* @constant
* @since 3.0
*/
UUID.FIELD_NAMES = ["timeLow", "timeMid", "timeHiAndVersion",
"clockSeqHiAndReserved", "clockSeqLow", "node"];

/**
* Sizes of UUID internal fields.
* @type {number[]}
* @constant
* @since 3.0
*/
UUID.FIELD_SIZES = [32, 16, 16, 8, 8, 48];

/**
* Creates a version 4 {@link UUID} object.
* @returns {UUID} Version 4 {@link UUID} object.
* @since 3.0
*/
UUID.genV4 = function() {
var rand = UUID._getRandomInt;
return new UUID()._init(rand(32), rand(16), // time_low time_mid
0x4000 | rand(12),  // time_hi_and_version
0x80   | rand(6),   // clock_seq_hi_and_reserved
rand(8), rand(48)); // clock_seq_low node
};

/**
* Converts a hexadecimal UUID string to a {@link UUID} object.
* @param {string} strId Hexadecimal UUID string ("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
* @returns {UUID} {@link UUID} object or null.
* @since 3.0
*/
UUID.parse = function(strId) {
var r, p = /^\s*(urn:uuid:|\{)?([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{2})([0-9a-f]{2})-([0-9a-f]{12})(\})?\s*$/i;
if (r = p.exec(strId)) {
var l = r[1] || "", t = r[8] || "";
if (((l + t) === "") ||
(l === "{" && t === "}") ||
(l.toLowerCase() === "urn:uuid:" && t === "")) {
return new UUID()._init(parseInt(r[2], 16), parseInt(r[3], 16),
parseInt(r[4], 16), parseInt(r[5], 16),
parseInt(r[6], 16), parseInt(r[7], 16));
}
}
return null;
};

/**
* Initializes a {@link UUID} object.
* @private
* @constructs UUID
* @param {number} [timeLow=0] time_low field (octet 0-3, uint32).
* @param {number} [timeMid=0] time_mid field (octet 4-5, uint16).
* @param {number} [timeHiAndVersion=0] time_hi_and_version field (octet 6-7, uint16).
* @param {number} [clockSeqHiAndReserved=0] clock_seq_hi_and_reserved field (octet 8, uint8).
* @param {number} [clockSeqLow=0] clock_seq_low field (octet 9, uint8).
* @param {number} [node=0] node field (octet 10-15, uint48).
* @returns {UUID} this.
*/
UUID.prototype._init = function() {
var names = UUID.FIELD_NAMES, sizes = UUID.FIELD_SIZES;
var bin = UUID._binAligner, hex = UUID._hexAligner;

/**
* UUID internal field values as an array of integers.
* @type {number[]}
*/
this.intFields = new Array(6);

/**
* UUID internal field values as an array of binary strings.
* @type {string[]}
*/
this.bitFields = new Array(6);

/**
* UUID internal field values as an array of hexadecimal strings.
* @type {string[]}
*/
this.hexFields = new Array(6);

for (var i = 0; i < 6; i++) {
var intValue = parseInt(arguments[i] || 0);
this.intFields[i] = this.intFields[names[i]] = intValue;
this.bitFields[i] = this.bitFields[names[i]] = bin(intValue, sizes[i]);
this.hexFields[i] = this.hexFields[names[i]] = hex(intValue, sizes[i] >>> 2);
}

/**
* UUID version number.
* @type {number}
*/
this.version = (this.intFields.timeHiAndVersion >>> 12) & 0xF;

/**
* 128-bit binary string representation.
* @type {string}
*/
this.bitString = this.bitFields.join("");

/**
* Non-delimited hexadecimal string representation ("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx").
* @type {string}
* @since v3.3.0
*/
this.hexNoDelim = this.hexFields.join("");

/**
* Hexadecimal string representation ("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
* @type {string}
*/
this.hexString = this.hexFields[0] + "-" + this.hexFields[1] + "-" + this.hexFields[2]
+ "-" + this.hexFields[3] + this.hexFields[4] + "-" + this.hexFields[5];

/**
* URN string representation ("urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
* @type {string}
*/
this.urn = "urn:uuid:" + this.hexString;

return this;
};

/**
* Converts an integer to a zero-filled binary string.
* @private
* @param {number} num
* @param {number} length
* @returns {string}
*/
UUID._binAligner = function(num, length) {
var str = num.toString(2), i = length - str.length, z = "0";
for (; i > 0; i >>>= 1, z += z) { if (i & 1) { str = z + str; } }
return str;
};

/**
* Returns the hexadecimal string representation.
* @returns {string} {@link UUID#hexString}.
*/
UUID.prototype.toString = function() { return this.hexString; };

/**
* Tests if two {@link UUID} objects are equal.
* @param {UUID} uuid
* @returns {boolean} True if two {@link UUID} objects are equal.
*/
UUID.prototype.equals = function(uuid) {
if (!(uuid instanceof UUID)) { return false; }
for (var i = 0; i < 6; i++) {
if (this.intFields[i] !== uuid.intFields[i]) { return false; }
}
return true;
};

/**
* Nil UUID object.
* @type {UUID}
* @constant
* @since v3.4.0
*/
UUID.NIL = new UUID()._init(0, 0, 0, 0, 0, 0);

// }}}

// UUID Version 1 Component {{{

/**
* Creates a version 1 {@link UUID} object.
* @returns {UUID} Version 1 {@link UUID} object.
* @since 3.0
*/
UUID.genV1 = function() {
if (UUID._state == null) { UUID.resetState(); }
var now = new Date().getTime(), st = UUID._state;
if (now != st.timestamp) {
if (now < st.timestamp) { st.sequence++; }
st.timestamp = now;
st.tick = UUID._getRandomInt(4);
} else if (Math.random() < UUID._tsRatio && st.tick < 9984) {
// advance the timestamp fraction at a probability
// to compensate for the low timestamp resolution
st.tick += 1 + UUID._getRandomInt(4);
} else {
st.sequence++;
}

// format time fields
var tf = UUID._getTimeFieldValues(st.timestamp);
var tl = tf.low + st.tick;
var thav = (tf.hi & 0xFFF) | 0x1000;  // set version '0001'

// format clock sequence
st.sequence &= 0x3FFF;
var cshar = (st.sequence >>> 8) | 0x80; // set variant '10'
var csl = st.sequence & 0xFF;

return new UUID()._init(tl, tf.mid, thav, cshar, csl, st.node);
};

/**
* Re-initializes the internal state for version 1 UUID creation.
* @since 3.0
*/
UUID.resetState = function() {
UUID._state = new UUIDState();
};

function UUIDState() {
var rand = UUID._getRandomInt;
this.timestamp = 0;
this.sequence = rand(14);
this.node = (rand(8) | 1) * 0x10000000000 + rand(40); // set multicast bit '1'
this.tick = rand(4);  // timestamp fraction smaller than a millisecond
}

/**
* Probability to advance the timestamp fraction: the ratio of tick movements to sequence increments.
* @private
* @type {number}
*/
UUID._tsRatio = 1 / 4;

/**
* Persistent internal state for version 1 UUID creation.
* @private
* @type {UUIDState}
*/
UUID._state = null;

/**
* @private
* @param {Date|number} time ECMAScript Date Object or milliseconds from 1970-01-01.
* @returns {any}
*/
UUID._getTimeFieldValues = function(time) {
var ts = time - Date.UTC(1582, 9, 15);
var hm = ((ts / 0x100000000) * 10000) & 0xFFFFFFF;
return  { low: ((ts & 0xFFFFFFF) * 10000) % 0x100000000,
mid: hm & 0xFFFF, hi: hm >>> 16, timestamp: ts };
};

// }}}

// create local namespace
function UUID() {}

// for nodejs
if (typeof module === "object" && typeof module.exports === "object") {
module.exports = UUID;
}

return UUID;

})(UUID);

// vim: fdm=marker fmr&
