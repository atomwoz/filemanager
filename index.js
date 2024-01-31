const express = require("express")
const hbs = require("express-handlebars")
const path = require("path")
const formidable = require("formidable");
const fs = require("fs");
const app = express();

app.use(express.static('static'))
app.use(express.static('PLIKI'))
app.set('views', path.join(__dirname, 'templates'));        // ustalamy katalog views
app.engine('hbs', hbs({
    defaultLayout: 'main.hbs',
    extname: '.hbs',
    partialsDir: "templates/partials",
    helpers: {
        blend(file) {
            let fileS = file.split(".")
            let ext = fileS[fileS.length - 1]
            if (["jpg", "png", "txt", "pdf"].includes(ext))
                return "/ico/" + ext + ".png"
            else
                return "/ico/file.png"
        }
    }
}));   // domyślny layout, potem można go zmienić
app.use(express.json()); // Add this line to parse JSON data in the request body
app.set('view engine', 'hbs');                           // określenie nazwy silnika szablonów
app.use(express.urlencoded({ extended: true }))

let ORACLE = 0

const getBase = (req) => {
    let cPath = ""
    if (!req.query.p || req.query.p == "" || req.query.p == 'undefined')
        cPath = ""
    else
        cPath = decodeURIComponent(req.query.p)
    return [path.join(__dirname, 'PLIKI', cPath), cPath]
}

app.post("/style", (req, res) => {
    fs.writeFileSync(path.join(__dirname, "static", "style.json"), JSON.stringify(req.body))
    res.send("OK")
    ORACLE++
})


app.post("/saveFile", (req, res) => {
    let [base, cPath] = getBase(req);
    fs.writeFile(base, req.body.text, (err) => {
        if (err) {
            res.send("Error in saving file !")
            return
        }
        res.send("File saved !")
    })
    ORACLE++
})

app.get("/createFolder", (req, res) => {
    let [base, cPath] = getBase(req);
    let folderName = decodeURIComponent(req.query.name);
    fs.mkdir(path.join(base, folderName), (err) => {
        if (err) {
            res.send("Error in creating folder !");
            return
        }
        res.redirect("/?p=" + cPath);
    });
    ORACLE++
});

app.get("/createFile", (req, res) => {
    let [base, cPath] = getBase(req);
    let fileName = decodeURIComponent(req.query.name)
    let extensions = fs.readdirSync(path.join(__dirname, 'file-templates'))
    let ext = fileName.split(".")[1]
    if (extensions.includes(ext)) {
        try {
            fs.copyFileSync(path.join(__dirname, 'file-templates', ext), path.join(base, fileName))
        }
        catch
        {
            res.send("Error in creating file !");
            return
        }
        res.redirect("/?p=" + cPath)
    }
    else {
        fs.appendFile(path.join(base, fileName), "", (err) => {
            if (err) {
                res.send("Error in creating file !");
                return
            }
            res.redirect("/?p=" + cPath)
        })
    }
    ORACLE++
})

app.get("/delete", (req, res) => {
    let [base, cPath] = getBase(req);
    fs.unlink(base, (err) => {
        if (err) {
            res.send("Error in deleting file !");
            return
        }
        res.redirect("/?p=" + path.dirname(cPath))
    })
    ORACLE++
})

app.get("/deleteFolder", (req, res) => {
    let [base, cPath] = getBase(req);
    fs.rmdir(base, (err) => {
        if (err) {
            res.send("Error in deleting folder !");
            return
        }
        res.redirect("/?p=" + path.dirname(cPath))
    })
    ORACLE++
})

app.post("/upload", (req, res) => {
    let form = formidable({ multiples: true });
    form.parse(req, function (err, fields, files) {
        let [base, cPath] = getBase(req);
        console.log(cPath)
        if (Array.isArray(files.fileToUpload)) files = files.fileToUpload
        else files = [files.fileToUpload]
        files.forEach(file => {
            if (file.size > 0)
                fs.rename(file.path, path.join(base, file.name), (err) => {
                    if (err) {
                        res.send("Error in uploading file!");
                        return
                    }
                    console.log(path.join(base, file.name))

                })
        })
        res.redirect("/?p=" + cPath)
    });
    ORACLE++
})

app.get("/rename", (req, res) => {
    let [base, cPath] = getBase(req);
    if (cPath == "") {
        res.send("Nie można zmienić nazwy głównego folderu")
        return
    }
    let newName = req.query.name
    let newPath = path.join(path.dirname(base), newName)
    fs.rename(base, newPath, (err) => {
        if (err) {
            res.send("Error in renaming !");
            return
        }
        //Get last part of the base var 
        cPath = cPath.split("/").slice(0, -1)
        cPath = cPath + "/" + newName
        res.redirect("/?p=" + cPath)
    })
    ORACLE++
})

app.get("/oracle", (req, res) => {
    res.send(ORACLE.toString())
})

app.get("/editor", (req, res) => {
    let [base, cPath] = getBase(req);
    let content = fs.readFileSync(base, "utf8")
    res.render("editor", { content, path: cPath })
})

app.get("/", (req, res) => {
    let filesToShow = []
    let folders = []
    let [base, cPath] = getBase(req);
    if (!fs.existsSync(base)) {
        res.redirect("/")
        return
    }
    fs.readdir(base, (err, files) => {
        if (err) {
            res.send("Error in lsing folder !");
            return
        }
        files.forEach(file => {
            if (fs.lstatSync(path.join(base, file)).isDirectory()) {
                folders.push({ name: file, path: path.join(cPath, file).replace(/\\/g, "/") })
            } else {
                filesToShow.push({ name: file, path: path.join(cPath, file).replace(/\\/g, "/") })
            }
        })
        let currentPath = cPath.split("/").map((e, i, arr) => {
            return { name: e, path: arr.slice(0, i + 1).join("/") }
        })
        res.render("home", { files: filesToShow, folders, currentPath, path: cPath })
    });
})

app.listen(4000)