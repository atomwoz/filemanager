function updateLineNumbers() {
    $(".line-numberer").innerHTML = "";
    $("#text").value.split("\n").forEach((line, i) => {
        $(".line-numberer").innerHTML += i + 1 + "<br/>";
        if (line.length > $("#text").cols)
            $(".line-numberer").innerHTML += "⤷<br/>";
    });
}

function update() {
    updateLineNumbers();

}

$("#text").addEventListener("input", update);

update();