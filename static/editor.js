let lastSaveTextHash = 0
let styleObject = {
    fontSize: 16,
    fontFamily: "monospace",
    mainColor: "#000000",
    backgroundColor: "#ffffff"
}

function updateLineNumbers() {
    $(".line-numberer").innerHTML = "";
    $("#text").value.split("\n").forEach((line, i) => {
        $(".line-numberer").innerHTML += i + 1 + "<br/>";
        if (line.length > $("#text").cols)
            $(".line-numberer").innerHTML += "⤷<br/>";
    });
}

function applyStyle() {
    $("#text").style.fontSize = styleObject.fontSize + "px";
    $("#text").style.fontFamily = styleObject.fontFamily;
    $("#text").style.color = styleObject.mainColor;
    $("#text").style.backgroundColor = styleObject.backgroundColor;
    $(".line-numberer").style.fontSize = styleObject.fontSize + "px";
    updateLineNumbers();
}

function fontBigger() {
    styleObject.fontSize += 1;
    applyStyle();
    writeStyleToServer()
}

function fontSmaller() {
    styleObject.fontSize -= 1;
    applyStyle();
    writeStyleToServer()
}

function showSucc() {
    $(".modal").style.display = "block"
    setTimeout(() => {
        $(".modal").style.display = "none"
    }, 1000);

}

function saveFile() {
    const textValue = $("#text").value;
    const pQueryParam = new URLSearchParams(window.location.search).get("p");
    fetch('/saveFile?p=' + pQueryParam, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textValue })
    })
        .then(res => res.text()).then(res => {
            showSucc()
            lastSaveTextHash = cyrb53($("#text").value)
            updateSaveButton()
        }).catch(err => {
            alert("Error in saving file!")
        })

}

function updateSaveButton() {
    $("#save").disabled = cyrb53($("#text").value) == lastSaveTextHash
}

function update() {
    updateLineNumbers();
    updateSaveButton();
}

function getStyleFromServer() {
    fetch("/style.json").then(res => res.json()).then(res => {
        styleObject = res;
        applyStyle();
    })
}

function writeStyleToServer() {
    fetch("/style", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(styleObject)
    })
}

getStyleFromServer();
lastSaveTextHash = cyrb53($("#text").value)
$("#text").addEventListener("input", update);

update();