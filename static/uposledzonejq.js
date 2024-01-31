function $random(min, max) {
    return Math.random() * (max - min) + min;
}

function $(s) {
    return document.querySelector(s)
}

function $q(q) {
    return document.querySelectorAll(q)
}

function $id(id) {
    return document.getElementById(id)
}

function $c(c) {
    return document.getElementsByClassName(c);
}

function $mk(elem, className = "") {
    let x = document.createElement(elem);
    if (className != "") {
        x.className = className
    }
    return x
}

//Funkcja hashująca text 53 bitowym hashem 
//https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

window.$ = $;