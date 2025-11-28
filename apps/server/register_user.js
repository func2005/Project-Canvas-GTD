const http = require('http');

const data = JSON.stringify({
    username: 'user_curl_node_2',
    password: 'password'
});

const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        const parsed = JSON.parse(body);
        require('fs').writeFileSync('token.txt', parsed.access_token);
        console.log('Token saved to token.txt');
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
