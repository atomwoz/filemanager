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

window.$ = $;