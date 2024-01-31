const express = require("express")
const hbs = require("express-handlebars")
const path = require("path")
const app = express()


app.use(express.static('static'))
app.set('views', path.join(__dirname, 'templates'));        // ustalamy katalog views
app.engine('hbs', hbs({
    defaultLayout: 'main.hbs',
    extname: '.hbs',
    partialsDir: "templates/partials",
    helpers: {
        helper(thi, x, v) {
            return thi[x] == v
        }

    }
}));   // domyślny layout, potem można go zmienić
app.set('view engine', 'hbs');                           // określenie nazwy silnika szablonów

const Datastore = require('nedb')
const db = new Datastore({
    filename: 'data/database.db',
    autoload: true
});

function isStrictInteger(value) {
    // Use regular expression to check for a string representing a strict integer
    return /^[0-9]+$/.test(value);
}

function editableSwitch(req, res, editable, all=false) {
    db.update(all ? {} : { _id: req.params.id }, { $set: {editable} }, {multi: true}, function (err, numReplaced) {
        if (err) {
            const context = { "error": `Błąd bazy danych podczas umożliwania do edycji` }
            res.render('err.hbs', context);
        } else {
            res.redirect("/edit");
        }
    });
}

app.use(express.urlencoded({
    extended: true
}));

app.get("/", function (req, res) {
    res.render('home.hbs');  // nie podajemy ścieżki tylko nazwę pliku
})

app.get("/add", function (req, res) {
    res.render('add.hbs');  // nie podajemy ścieżki tylko nazwę pliku
})

app.post("/add", function (req, res) {

    let base = {
        safe: "NIE",
        benzin: "NIE",
        broken: "NIE",
        x4motor: "NIE"
    }
    let keys = Object.keys(req.body)
    let body = {}
    keys.forEach(v => {
        body[v] = "TAK"
    })
    Object.assign(base, body)

    db.insert(base, (e, d) => {
        if (e == null) {
            const context = { "info": `Rekord z ID=${d._id} został dodany` }
            res.render('add.hbs', context);  // nie podajemy ścieżki tylko nazwę pliku
        }
        else {
            const context = { "error": `Błąd bazy danych` }
            res.render('err.hbs', context);
        }
    })

})

app.get("/list", function (req, res) {
    db.find({}).exec((e, d) => {
        const context = { data: d, info: "" }
        res.render('list.hbs', context);
    })
    // nie podajemy ścieżki tylko nazwę pliku
})

app.get("/delete", function (req, res) {
    db.find({}).exec((e, d) => {
        const count = parseInt(req.query.count)
        let countText = count ? ("Removed " + count + (count > 1 ? " cars" : " car")) : undefined

        if (count === 0) {
            countText = "Niczego nie usunięto :("
        }

        //Troche easter egg
        if (!isStrictInteger(req.query.count) && req.query.count != undefined) {
            countText = "Nigdy nie ufaj danym od użytkownika ;)"
        }
        const context = { data: d, info: "", cars_count: countText }
        res.render('delete.hbs', context);
    })
})

app.post("/delAll", function (req, res) {
    db.remove({}, { multi: true }, (err, numRemoved) => {
        if (err) {
            const context = { "error": `Błąd bazy danych podczas usuwania wszystkich rekordów` }
            res.render('err.hbs', context);
        } else {
            res.redirect("/delete?count=" + numRemoved)
        }
    });
});

app.post("/delSelected", function (req, res) {
    const selectedCheckboxes = req.body;
    const selectedIds = Object.keys(selectedCheckboxes).map(id => id);
    db.remove({ _id: { $in: selectedIds } }, { multi: true }, (err, numRemoved) => {
        if (err) {
            const context = { "error": `Błąd bazy danych podczas usuwania zaznaczonych rekordów` }
            res.render('err.hbs', context);
        } else {
            res.redirect("/delete?count=" + numRemoved)
        }
    });
});

app.post("/delOne/:id", function (req, res) {
    const recordId = req.params.id;
    db.remove({ _id: recordId }, {}, (err, numRemoved) => {
        if (err) {
            const context = { "error": `Błąd bazy danych podczas usuwania rekordu o ID=${recordId}` }
            res.render('err.hbs', context);
        } else {
            res.redirect("/delete?count=" + numRemoved)
        }
    });
});

app.get("/edit", function (req, res) {
    db.find({}).exec((e, d) => {
        const anyEditable = d.reduce( (a,b) => a || b.editable, false)
        const context = { data: d, anyEditable }
        res.render('edit.hbs', context);
    })
})

app.post("/editOne/:id", function (req, res) {
   editableSwitch(req, res, true)
})

app.post("/uneditOne/:id", function (req, res) {
    editableSwitch(req, res, undefined)
})

app.get("/uneditAll", function (req, res) {
    editableSwitch(req, res, undefined, true)
})

app.post("/updateOne/:id", function (req, res) {
    const id = req.params.id
    let filtered = Object.entries(req.body).filter(v => v[0].startsWith(id + "_"))
    filtered = filtered.map(v => [v[0].substring(id.length + 1), v[1]])
    filtered = Object.fromEntries(filtered)
    filtered["editable"] = false
    db.update({ _id: id }, { $set: filtered }, {}, function (err, numReplaced) {
        if (err) {
            const context = { "error": `Błąd bazy danych podczas zmiany rekordu o ID=${id}` }
            res.render('err.hbs', context);
        } else {
            res.redirect("/edit");
        }
    });
})

app.listen(4000)