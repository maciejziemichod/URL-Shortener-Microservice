"use strict";

const express = require("express");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const cors = require("cors");
const validator = require("validator");

require("dotenv").config();

// Init
const app = express();

// Port
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  // Handle initial error
  .catch((err) => console.error(err))
  // Success
  .then(() => console.log("Connected to DB"));

// Handle errors after established connection
mongoose.connection.on(
  "error",
  console.error.bind(console, "connection error")
);

// Schema
const shortUrlSchema = new mongoose.Schema({
  url: String,
  shortUrl: Number,
});

// Model
const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);

// Enabling remote freeCodeCamp testing
app.use(cors());

// Body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Absolute path to directory in case of running from another directory
app.use("/public", express.static(process.cwd() + "/public"));

// Index
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// API create new
app.post("/api/shorturl/new", (req, res) => {
  // Getting url from request no matter how is the key named
  const givenUrl = Object.values(req.body)[0];

  // Checking if URL is valid
  if (validator.isURL(givenUrl, { require_protocol: true })) {
    // Checking if URL is in DB
    ShortUrl.findOne({ url: givenUrl }, "url shortUrl")
      .exec()
      .then((result) => {
        if (result) {
          // Not new
          const { url: originalURL, shortUrl: shortURL } = result;
          res.json({ originalURL, shortURL });
        } else {
          // New
          ShortUrl.find()
            .sort({ shortUrl: -1 })
            .limit(1)
            .exec()
            .then((result) => {
              const shortUrl = result[0].shortUrl + 1;
              const short = new ShortUrl({ url: givenUrl, shortUrl });
              short.save((err, short) => {
                if (err) return console.error(err);
                return console.log("URL saved");
              });
              res.json({
                originalURL: givenUrl,
                shortURL: shortUrl,
              });
            })
            .catch((err) => console.error(err));
        }
      })
      .catch((err) => console.error(err));
  } else {
    // Incorrect
    res.json({ error: "invalid URL" });
  }
});

// API list of shortcuts
app.get("/api/shorturl/list", (req, res) => {
  ShortUrl.find()
    .sort({ shortUrl: 1 })
    .exec()
    .then((result) => {
      const list = [];
      result.forEach((elem) => {
        const data = { url: elem.url, shortUrl: elem.shortUrl };
        list.push(data);
      });
      res.json(list);
    });
});

// API use shortcut
app.get("/api/shorturl/:short", (req, res) => {
  // checking if shortcut is valid
  ShortUrl.findOne({ shortUrl: req.params.short })
    .exec()
    .then((response) => {
      if (response) {
        res.redirect(response.url);
      } else {
        res.json({ error: "shortcut not found" });
      }
    })
    .catch((err) => console.error(err));
});

// Listening
app.listen(port, () => {
  console.log("Node.js listening ...");
});
