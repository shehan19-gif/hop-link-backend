const express = require("express");
const mongoose = require("mongoose");
const shortid = require("shortid");
const cors = require("cors");
const Url = require("./models/url");
require('dotenv').config();
const rateLimit = require("express-rate-limit");

// access rate limit

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// validate URLs

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch(err) {
        return false;
    }
}

const app = express();
app.use(express.json());
app.use(cors({
  origin: ["https://hop-link.vercel.app/"],
  credentials: true
}));

// connect to db

mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// shorten url endpoint

app.post("/shorten", async(req, res) => {
    const {originalUrl} = req.body;

    if(!isValidUrl(originalUrl)) {
        return res.status(400).json({error: "Invalid URL"});
    }

    try {
        // check if URL already exists
        let url = await Url.findOne({originalUrl});
        if(url) {
            return res.json(url);
        }

        // create a new short URL
        const shortCode = shortid.generate();
        const shortUrl = `${req.headers.host}/${shortCode}`;

        url = new Url({
            originalUrl,
            shortCode
        });

        await url.save();
        res.json({originalUrl, shortUrl, shortCode});
    } catch(err) {
        console.error(err);
        res.status(500).json("Server error");
    }
});

// redirect endpoint

app.get("/:shortCode", async(req, res) => {
    try {
        const url = await Url.findOne({shortCode: req.params.shortCode});
        if(!url) {
            return res.status(404).json("URL not found");
        }

        // increment click event

        url.clicks++;
        await url.save();
        res.redirect(url.originalUrl);
    } catch(err) {
        console.error(err);
        res.status(500).json("Server error");
    }
})

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));