const http = require('http');
const fs = require('fs');

const token = fs.readFileSync('token.txt', 'utf8');

const data = JSON.stringify({
    changeRows: [
        {
            newDocument: {
                id: '550e8400-e29b-41d4-a716-446655440000',
                user_id: 'user_curl_node_2', // Should be overwritten by server but good to have
                widget_type: 'calendar_master',
                updated_at: new Date().toISOString(),
                is_deleted: false,
                data_source_config: {},
                geometry: { x: 0, y: 0, w: 100, h: 100 },
                canvas_id: 'default_canvas'
            }
        }
    ]
});

const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/sync/widgets/push',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', body);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
