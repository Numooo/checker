const fs = require('fs');
const fetch = require('node-fetch');
const config = require('./config.json');
const keep_alive = require('./keep_alive.js');

const CHECK_INTERVAL = 30 * 60 * 1000;

const namesRaw = fs.readFileSync('names.txt', 'utf-8')
    .split('\n')
    .map(line => line.trim().replace(/'/g, '').toLowerCase())
    .filter(Boolean)
    .reverse();

const names = [...new Set(namesRaw)];
const checkNames = [];

const checkedNames = [
    'babe', 'anil', 'ates', 'boyo', 'chiz', 'cord',
    'cuff', 'cums', 'dame', 'dare', 'date', 'dewy',
    'days', 'dorb', 'dope', 'dork', 'drug', 'dray',
    'drop', 'dunk', 'duff', 'echo', 'easy', 'duro',
    'euks', 'exec', 'ells', 'feed', 'food', 'ghee',
    'guns', 'hack', 'heal', 'help', 'here', 'home',
    'howl', 'husk', 'jobs', 'jean', 'kata', 'kill',
    'kiss', 'leaf', 'lime', 'live', 'lowt', 'mack',
    'magi', 'mads', 'marc', 'mood', 'nide', 'oink',
    'paid', 'papa', 'ponk', 'poor', 'prez', 'rage',
    'rich', 'rock', 'rook', 'rudy', 'saft', 'sept',
    'sett', 'skee', 'smit', 'suni', 'swag', 'taki',
    'tays', 'team', 'test', 'till', 'waid', 'wins',
    'woes', 'year', 'yuft', 'ziff'
];

const clientId = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

async function doubleCheck(name) {
    if (!name) return;

    try {
        const res = await fetch('https://gql.twitch.tv/gql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-ID': clientId,
            },
            body: JSON.stringify([
                {
                    operationName: 'UsernameValidator_User',
                    variables: { username: name },
                    extensions: {
                        persistedQuery: {
                            version: 1,
                            sha256Hash: 'fd1085cf8350e309b725cf8ca91cd90cac03909a3edeeedbd0872ac912f3d660',
                        },
                    },
                },
            ]),
        });

        const json = await res.json();

        if (!json[0]?.data?.isUsernameAvailable) {
            checkNames.push(name);
        } else {
            console.log(`✅ [${name}] AVAILABLE`);
        }
    } catch (err) {
        console.error('Retrying doubleCheck:', name);
        await doubleCheck(name);
    }
}

async function checkBatch() {
    const operations = [];
    const checkingNames = [];

    while (operations.length < 35 && names.length > 0) {
        const name = names.pop();
        if (!name) break;

        checkingNames.push(name);
        operations.push({
            operationName: 'ChannelShell',
            variables: { login: name },
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: '580ab410bcd0c1ad194224957ae2241e5d252b2c5173d8e0cce9d32d5bb14efe',
                },
            },
        });
    }

    if (operations.length === 0) return;

    try {
        const res = await fetch('https://gql.twitch.tv/gql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-ID': clientId,
            },
            body: JSON.stringify(operations),
        });

        const json = await res.json();

        for (let i = 0; i < json.length; i++) {
            const entry = json[i];
            const user = entry?.data?.userOrError;
            const login = operations[i]?.variables?.login;

            if (user?.reason === 'UNKNOWN') {
                await doubleCheck(login);
            }
        }
    } catch (err) {
        console.error('ERROR:', err);
        for (const name of checkingNames) {
            names.push(name);
        }
    }
}

function getArrayDifference(arr1, arr2) {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const added = [...set1].filter(x => !set2.has(x));
    const removed = [...set2].filter(x => !set1.has(x));
    return { added, removed };
}

async function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.telegramChatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        const json = await res.json();
        if (!json.ok) console.error('Telegram Error:', json);
    } catch (err) {
        console.error('Failed to send Telegram message:', err.message);
    }
}

async function compareAndNotify() {
    const current = [...new Set(checkNames)].sort();
    const previous = [...checkedNames].sort();

    const { added, removed } = getArrayDifference(current, previous);

    if (added.length || removed.length) {
        let message = '';
        if (added.length) message += `➕ Добавилось: ${added.join(', ')}\n`;
        if (removed.length) message += `🔔 Забирай: ${removed.join(', ')}`;
        await sendToTelegram(message);
    } else {
    }

    checkNames.length = 0;
}

async function main() {

    const originalNames = [...names];

    setInterval(async () => {

        names.splice(0, names.length, ...originalNames);

        while (names.length > 0) {
            await checkBatch();
            await new Promise(res => setTimeout(res, 100));
        }

        await compareAndNotify();

    }, CHECK_INTERVAL);
}


main();
