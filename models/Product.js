var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    url: String,
    md5: { type : String , unique : true, required : true, dropDups: true },
    data: Object,
    updated: { type: Date, default: Date.now },
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Product', schema);
