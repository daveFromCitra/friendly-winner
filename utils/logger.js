const fs = require('fs');

function logger(input, meta = '{"call": "default"}') {
    const output = `${input} - ${meta}`
    const filePath = './log.txt';
    fs.appendFileSync(filePath, output + '\n');
}

module.exports = {
    logger
}