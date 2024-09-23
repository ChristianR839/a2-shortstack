// const http       = require("http");
// const fs         = require("fs");
// const mime       = require("mime");
const express    = require("express");
const cookie     = require("cookie-session");
const handlebars = require("express-handlebars").engine;

// Project function imports
const {cookieKey1, cookieKey2} = require("./public/js/private.js");
const
{
  DB_CreateDocument,
  DB_UpdateDocument,
  DB_DeleteDocument,
  DB_FindDocuments,
} = require("./public/js/database.js");

// Local directory
const dir  = "public/";

// Server port
const port = 3000;

// Setup express
const app = express();
app.engine("handlebars", handlebars());
app.use(express.static("./"));
app.use(express.json());
app.set("view engine", "handlebars");
app.set("views", "./views");

// Setup cookies
app.use
(
  cookie
  ({
    name: 'session',
    keys: [cookieKey1, cookieKey2],
    SameSite: "None"
  })
);

// Data table for active laptop loans
let activeLoans = 
[
  {"id": -1, "firstname": "placeholder", "lastname": "placeholder", "dup":false},

  // Example loans
  {"id": 2, "firstname": "John", "lastname": "Smith", "dup":false},
  {"id": 9, "firstname": "Matthew", "lastname": "Stinson", "dup":false},
  {"id": 14, "firstname": "Jess", "lastname": "Stairs", "dup":false},
  {"id": 15, "firstname": "Austin", "lastname": "Murphy", "dup":false},
  {"id": 20, "firstname": "matthew", "lastname": "stinson", "dup":false},
]

/**
 * Formats a log message to include message source.
 * 
 * @param {string} src Message source.
 * @param {string} message Base log message.
 * @returns Formatted log message.
 */
const formatLog = function(src, message)
{
  return `[${src.toUpperCase()}] → ${message}`;
}

// POST login handler
app.post("/login", async (request, response) =>
{
  const result = await DB_FindDocuments({user: request.body.user}, "logins");

  if (result.length === 0)
  {
    if (request.body.user === "logins")
    {
      request.session.login = false;
      request.session.username = "--";
  
      response.status(422).send("Illegal Username");
      return;
    }

    await DB_UpdateDocument({user: request.body.user, pass: request.body.pass}, "logins");

    request.session.login = true;
    request.session.username = request.body.user;

    response.end();
  }
  else if (result.length === 1)
  {
    if (request.body.user === "logins")
    {
      request.session.login = false;
      request.session.username = "--";
  
      response.status(422).send("Illegal Username");
      return;
    }

    if (result[0].pass === request.body.pass)
    {
      request.session.login = true;
      request.session.username = request.body.user;

      // response.render("index", {loginmsg: `Logged in as ${request.body.user}`, layout: false});
      response.end();
      console.log(formatLog("SERVER", `Logged in as ${request.body.user}`));
    }
    else
    {
      request.session.login = false;
      request.session.username = "--";

      response.status(422).send("Invalid Password");
    }
  }
  else if (result.length > 1)
  {
    request.session.login = false;
    request.session.username = "--";

    response.status(423).send("Multiple Users Exist in System");
  }
});

// Send unauthenticated user to login
app.use(function(request, response, next)
{
  if (request.session.login === true)
  {
    next();
  }
  else
  {
    console.log("NOT LOGGED IN :(");
    response.render("index", {layout:false});
  }
});

// General GET request handler
app.get("/", (request, response) =>
{
  response.render("index", {layout: false});
});

// GET table handler
app.get("/table", async (request, response) =>
{
  // TODO: DB_GetCollection
  // response.send(activeLoans);

  const table = await DB_FindDocuments({}, "test-user");
  response.send(table);
});

// POST submit handler
app.post("/submit", async (request, response) =>
{
  const laptopID = parseInt(request.body.id);
  if (isNaN(laptopID) || laptopID < 0)
  {
    response.status(422).send("Invalid ID");
  }
  else
  {
    // TODO: Get user from login session
    request.body.id = parseInt(request.body.id);
    await DB_UpdateDocument(request.body, "test-user");
    await duplicatesCheck();

    response.end("All good pardner");
  }
});

// POST submit handler
app.post("/remove", async (request, response) =>
{
  const laptopID = parseInt(request.body.id);

  // TODO: Get user from login session
  await DB_DeleteDocument(request.body, "test-user");
  await duplicatesCheck();
  response.end("Yippee");
});

const duplicatesCheck = async function()
{
  const collection = await DB_FindDocuments({}, "test-user");

  for (let baseRow = 0; baseRow < collection.length; baseRow++)
  {
    let match = false;

    for (let checkRow = 0; checkRow < collection.length; checkRow++)
    {
      if (baseRow !== checkRow)
      {
        match |= (collection[baseRow].firstname.toLowerCase() === collection[checkRow].firstname.toLowerCase() &&
                  collection[baseRow].lastname.toLowerCase() === collection[checkRow].lastname.toLowerCase());

        if (match == true)
        {
          break;
        }
      }
    }

    collection[baseRow].dup = Boolean(match);
    await DB_UpdateDocument(collection[baseRow], "test-user");
  }
}

// Start server on port
app.listen(process.env.PORT || port);
console.log(formatLog("SERVER", `Server running on port ${port}`));
