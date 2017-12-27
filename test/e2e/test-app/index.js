const express = require('express');
const http = require('http');
const app = express();
const port = 3000;

app.use(express.static(`${__dirname}`));

http.createServer(app).listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }

  console.log(`server is listening on ${port}`);
});
