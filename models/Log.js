var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    process: String,
    message: String,
    url    : String,
    updated: { type: Date, default: Date.now },
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Log', schema);
