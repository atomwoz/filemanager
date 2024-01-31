let lastSaveTextHash = 0

function updateLineNumbers() {
    $(".line-numberer").innerHTML = "";
    $("#text").value.split("\n").forEach((line, i) => {
        $(".line-numberer").innerHTML += i + 1 + "<br/>";
        if (line.length > $("#text").cols)
            $(".line-numberer").innerHTML += "⤷<br/>";
    });
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
        .catch(err => {
            alert("Error in saving file!")
        })
    lastSaveTextHash = cyrb53($("#text").value)
}

function updateSaveButton() {
    $("#save").disabled = cyrb53($("#text").value) == lastSaveTextHash
}

function update() {
    updateLineNumbers();
    updateSaveButton();
}

lastSaveTextHash = cyrb53($("#text").value)
$("#text").addEventListener("input", update);

update();