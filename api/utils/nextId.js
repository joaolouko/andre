const Counter = require('../models/Counter');

async function nextId(name) {
    const counter = await Counter.findOneAndUpdate(
        { name },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return counter.sequence;
}

module.exports = nextId;
