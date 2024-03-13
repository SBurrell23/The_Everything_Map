const http = require('http');
const url = require('url');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.argv[2] });

const server = http.createServer((req, res) => {
    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Parse URL and query parameters
    const parsedUrl = url.parse(req.url, true);

    // Handle different routes
    if (parsedUrl.pathname === '/api/combine')
        callCombineAI(req, res, parsedUrl.query.word1, parsedUrl.query.word2);
    else if (parsedUrl.pathname === '/api/thought')
         callThoughtAI(req, res);
    else 
        handleUnknownRoute(req, res);
});

async function callCombineAI(req, res, word1, word2) {
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
                I will give you two words (split by a colon) and you give exactly three words back.
                The words you return should be something that a human would understand as what they would get if the two given words were combined.
                The words should contain pop culture references if it makes sense to do so.
                Things like names of famous people/actors/actresses/movies/places/countries/types of food etc.
                Make sure the words are specific and fun.
                Include an appriopriate emoji for each word you find. Make sure the output is returned exactly like this every time:
                word: emoji, word: emoji, word: emoji
                `
            },
            { role: "user", content: word1+":"+word2},
        ],
        model: "gpt-3.5-turbo-0125"
    });
    console.log(completion.choices[0].message.content);
    res.statusCode = 200;
    res.end(JSON.stringify(completion.choices[0].message.content));
}


async function callThoughtAI(req, res) {
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content:`I want you to pick a random word/pro-noun and give it to me.
                It can be an object, a name of a movie, person, tv show, verb, adjective, book, actor or actress, literally anything at all. 
                You response should be the word and thats it. Nothing else.
                `
            },
            { role: "user", content: ""},
        ],
        model: "gpt-3.5-turbo-0125"
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
