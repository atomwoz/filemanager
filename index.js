const express = require("express")
const hbs = require("express-handlebars")
const path = require("path")
const formidable = require("formidable");
const fs = require("fs");
const filters = require('node-image-filter');
const cookieparser = require("cookie-parser");
const nocache = require("nocache");
const app = express();

app.use(nocache())
app.use(cookieparser())
app.use(express.static('static'))
app.use(express.static('PLIKI'))
app.use(express.static('TEMPS'))
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
const USER_EXPIRATION = 900000

class User {
    constructor(username, password) {
        this.username = username
        this.password = password
    }
    setSessionID(sessionID) {
        this.sessionID = sessionID
        this.expires = Date.now() + USER_EXPIRATION
    }
    getSessionID() {
        if (this.expires < Date.now()) {
            this.sessionID = undefined
        }
        return this.sessionID
    }
    isLoggedIn() {
        return this.getSessionID() != undefined
    }

}

function uuid() {
    const uid = () => Math.random().toString(36).substring(7);
    return uid() + uid() + uid() + uid();
}

let userDatabase = {
    users: [new User("admin", "admin")],
    addNewUser: function (username, password) {
        let newUser = new User(username, password)
        this.users.push(newUser)
    },
    userExists: function (username) {
        return this.users.some(user => user.username === username)
    },
    login: function (username, password) {
        let user = this.users.find(user => user.username === username)
        if (user && user.password === password) {
            let sessionID = uuid()
            do {
                sessionID = uuid()
            } while (this.users.some(user => user.getSessionID() === sessionID))
            user.setSessionID(sessionID)
            return sessionID
        }
        return undefined
    },
    logout: function (username) {
        let user = this.users.find(user => user.username === username)
        user.setSessionID(undefined)
    },
    userFromSessionID: function (sessionID) {
        return this.users.find(user => user.getSessionID() === sessionID)
    }
}



const effects = [
    { name: "grayscale", value: "70%" },
    { name: "invert", value: "70%" },
    { name: "sepia", value: "70%" },
    { name: "blur", value: "5px" },
    { name: "brightness", value: "70%" },
    { name: "sharpen", value: "70%" }
]

const getBase = (req) => {
    let cPath = ""
    if (!req.query.p || req.query.p == "" || req.query.p == 'undefined')
        cPath = ""
    else
        cPath = decodeURIComponent(req.query.p)
    return [path.join(__dirname, 'PLIKI', cPath), cPath]
}

function authorize(req, res = null) {
    if (req.cookies && req.cookies.sessionID) {
        let user = userDatabase.userFromSessionID(req.cookies.sessionID)
        if (!user) {
            if (res)
                res.clearCookie("sessionID")
            return false
        }
        return user
    }
    else {
        return false
    }
}


app.post("/style", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
    fs.writeFileSync(path.join(__dirname, "static", "style.json"), JSON.stringify(req.body))
    res.send("OK")
    ORACLE++
})


app.post("/saveFile", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
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
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
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

app.all("/preview", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
    let filter = req.body.filter || req.query.filter
    let value = req.body.value || req.query.value
    let imgPath = req.body.imgPath || req.query.imgPath
    filters.render(path.join(__dirname, "PLIKI/", imgPath), filters.preset[filter], function (result) {
        const name = `result.${result.type}` + Math.random().toString(36).substring(7) + "." + result.type
        result.data.pipe(fs.createWriteStream("TEMPS/" + name));
        // save local
        res.send(name);
    })
})

app.post("/save", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
    //Save filtered image on same path
    let filter = req.body.filter || req.query.filter
    let value = req.body.value || req.query.value
    let imgPath = req.body.imgPath || req.query.imgPath
    filters.render(path.join(__dirname, "PLIKI/", imgPath), filters.preset[filter], function (result) {
        const name = `result.${result.type}` + Math.random().toString(36).substring(7) + "." + result.type
        result.data.pipe(fs.createWriteStream(path.join(__dirname, "PLIKI/", imgPath)));
        // save local
        res.send(name);
    })
})

app.get("/createFile", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
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
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
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

app.get("/renameFile", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
    let [base, cPath] = getBase(req);
    const basePath = path.dirname(cPath)
    let newName = req.query.fileName
    let newPath = path.join(path.dirname(base), newName)
    fs.rename(base, newPath, (err) => {
        if (err) {
            res.send("Error in renaming !");
            return
        }
        cPath = cPath.split("/").slice(0, -1)
        cPath = cPath + "/" + newName
        res.redirect("/?p=" + basePath)
    })
    ORACLE++
})


app.get("/deleteFolder", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
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
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
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
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
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
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
    res.send(ORACLE.toString())
})

app.get("/editor", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
    let [base, cPath] = getBase(req);
    let content = fs.readFileSync(base, "utf8")
    res.render("editor", { content, path: cPath })
})

app.get("/image", (req, res) => {
    if (!authorize(req)) {
        res.redirect("/login")
        return
    }
    let [base, cPath] = getBase(req);
    res.render("image", { path: cPath, effects })
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.post("/login", (req, res) => {
    let username = req.body.username
    let password = req.body.password
    console.log(username, password)
    if (userDatabase.login(username, password)) {
        res.cookie("sessionID", userDatabase.login(username, password), { maxAge: USER_EXPIRATION, httpOnly: true })
        console.log("Logged in")
        res.redirect("/")
    }
    else {
        res.render("login", { error: "Invalid username or password" })
        console.log("Invalid username or password")
    }
})
app.get("/logout", (req, res) => {
    let u = authorize(req)
    if (!u) {
        res.redirect("/login")
        return
    }
    console.log("Logged out, " + u.username)
    userDatabase.logout(u.username)
    res.clearCookie("sessionID")
    res.redirect("/login")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.post("/register", (req, res) => {
    let username = req.body.username
    let password = req.body.password
    let password2 = req.body.password2
    if (password !== password2) {
        res.render("register", { error: "Passwords do not match" })
        return
    }
    if (userDatabase.userExists(username)) {
        res.render("register", { error: "User already exists" })
    }
    else {
        userDatabase.addNewUser(username, password)
        res.redirect("/login")
    }
})

app.get("/", (req, res) => {
    if (!authorize(req, res)) {
        res.redirect("/login")
        return
    }
    let filesToShow = []
    let gfxFiles = []
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
                if (file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".gif") || file.endsWith(".jpeg")) {
                    gfxFiles.push({ name: file, path: path.join(cPath, file).replace(/\\/g, "/") })
                }
                else {
                    filesToShow.push({ name: file, path: path.join(cPath, file).replace(/\\/g, "/") })
                }


            }
        })
        let currentPath = cPath.split("/").map((e, i, arr) => {
            return { name: e, path: arr.slice(0, i + 1).join("/") }
        })
        res.render("home", { files: filesToShow, gfxFiles, folders, currentPath, path: cPath, user: authorize(req).username })
    });
})

app.listen(4000)