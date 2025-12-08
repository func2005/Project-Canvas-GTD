const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const port = 3000;
const isWin = process.platform === 'win32';

async function killPort() {
    console.log(`Checking port ${port}...`);

    // 1. Find Process ID
    const findCommand = isWin
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port} -t`;

    let stdout;
    try {
        const result = await execAsync(findCommand);
        stdout = result.stdout;
    } catch (err) {
        // Command failed or no process found (findstr returns 1 if not found)
        console.log('No process found on port ' + port);
        return;
    }

    if (!stdout || !stdout.trim()) {
        console.log('No process found on port ' + port);
        return;
    }

    const lines = stdout.trim().split('\n');
    const pids = new Set();

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        // Windows: TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 1234
        // We want the last element (PID)
        const pid = isWin ? parts[parts.length - 1] : parts[0];

        if (pid && !isNaN(pid) && parseInt(pid) > 0) {
            pids.add(pid);
        }
    });

    if (pids.size === 0) {
        console.log('No PIDs found.');
        return;
    }

    // 2. Kill Processes
    for (const pid of pids) {
        console.log(`Killing process ${pid} on port ${port}...`);
        try {
            const killCommand = isWin ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
            await execAsync(killCommand);
            console.log(`Process ${pid} killed.`);
        } catch (err) {
            console.error(`Failed to kill ${pid}: ${err.message}`);
        }
    }

    // 3. Wait a moment to ensure OS releases port
    await new Promise(resolve => setTimeout(resolve, 1000));
}

killPort().catch(err => {
    console.error('Kill port script failed:', err);
    // Don't exit with error to allow start to proceed if possible
});
