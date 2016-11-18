var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    url: String,
    md5:  { type : String , unique : true, required : true, dropDups: true },
    status: String,
    updated: { type: Date, default: Date.now },
});

// create the model for users and expose it to our app
module.exports = mongoose.model('UrlInfo', schema);
