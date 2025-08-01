const http = require('http');

const PORT = process.env.PORT || 8080;

http.createServer((req, res) => {
    res.write("I'm alive");
    res.end();
}).listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
