const http = require('http');
const url = require('url');
const OpenAI = require('openai');
const { exit } = require('process');
const openai = new OpenAI({ apiKey: process.argv[2] });
const ipRequestCounts = new Map(); 

const server = http.createServer((req, res) => {
    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Parse URL and query parameters
    const parsedUrl = url.parse(req.url, true);

    // Handle different routes
    if (parsedUrl.pathname === '/api/combine')
        callCombineAI(req, res, parsedUrl.query.word1, parsedUrl.query.word2, parsedUrl.query.theme);
    else if (parsedUrl.pathname === '/api/thought')
         callThoughtAI(req, res);
    else 
        handleUnknownRoute(req, res);
});

// Request cap of 500 requests per user
function checkRequestCount(req,res) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const count = (ipRequestCounts.get(ip) || 0) + 1;
    ipRequestCounts.set(ip, count);
    if (count > 500) {
        res.statusCode = 429;
        res.end('Too many requests');
        return true;
      }
    return false;
}

async function callCombineAI(req, res, word1, word2,theme) {
    var overLimit = checkRequestCount(req,res);
    if(overLimit) 
        return;
    console.log("Input words: " + word1 + " : " + word2 + " / Theme:" + theme);
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: "",
            },
            {
                role: "system",
                content:`
                We are playing a game.
                I will give you two words (split by a colon) and you give exactly 4 words back.
                The words you return should be the top 4 words that most closely relate if you were to combine the two words I give you.
                At least two of the words should contain a pop culture references if it would make logical sense.
                Things like names of famous people/actors/actresses/movies/places/countries/types of food etc.
                Make sure the words are specific and fun.
                Include an appriopriate emoji for each word you find. 
                Make sure the output is returned exactly like this every time (INCLUDING THE COLON!):
                word : emoji,word : emoji,word : emoji,word : emoji
                `
            },
            { role: "user", content: word1+":"+word2},
        ],
        model: "gpt-4o"
    });
    
    if (!completion.choices[0].message.content.includes(":")) {
        console.log("INVALID RESPONSE! "+completion.choices[0].message.content+" Trying again...");
        callCombineAI(req, res, word1, word2);
    } else {
        console.log(completion.choices[0].message.content);
        res.statusCode = 200;
        res.end(JSON.stringify(completion.choices[0].message.content));
    }
}


async function callThoughtAI(req, res) {
    const alphabet = Array.from({ length: 22 }, (_, i) => String.fromCharCode(97 + i));
    const randomLetter1 = alphabet[Math.floor(Math.random() * alphabet.length)];
    const randomLetter2 = alphabet[Math.floor(Math.random() * alphabet.length)];
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content:`I want you to pick a random word that starts with the letter ${randomLetter1} and also contains the letter ${randomLetter2}.
                It must be a real world.
                You response should be the single word and thats it!!! Nothing else. 
                `
            },
            { role: "user", content: ""},
        ],
        model: "gpt-4o"
    });
    console.log(completion.choices[0].message.content);
    res.statusCode = 200;
    res.end(JSON.stringify(completion.choices[0].message.content));
}


function handleUnknownRoute(req, res) {
    res.statusCode = 404;
    res.end(JSON.stringify({ message: 'Route not found' }));
}

const port = 8080;
server.listen(port, () => {console.log(`Server is running on port ${port}`);});
