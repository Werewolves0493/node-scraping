//----------------------------------------------------------------------------------------------------------------------
//
//----------------------------------------------------------------------------------------------------------------------
var mongoose = require('mongoose');
var Product  = require('../models/Product');
var UrlInfo  = require('../models/UrlInfo');
var Log      = require('../models/Log');
var Process  = require('../crawler/Process');

module.exports = function(app){
    //--------------------------------------- index
    app.get('/', function (req, res) {
        var totalUrlCt = 0;
        var visitUrlCt = 0;
        var productCt = 0;
        var logs = [];
        UrlInfo.count({},function(err,c){
            if(!err) totalUrlCt = c;
            UrlInfo.count({status: 'complete'}, function(err, ct){
                if(!err) visitUrlCt = ct;

                getProductCt();
            });
        });
        var getProductCt = function(){
            Product.count({}, function(err, c){
                if(!err) productCt = c;
                getLogs();
            });
        }
        var getLogs = function(){
            Log.find({}, function(err, list){
                if(list) logs = list;
                output();
            }).sort({updated: "desc"}).limit(50);
        }
        var output = function(){
            res.render('index.ejs',{
                totalUrlCt : totalUrlCt,
                visitUrlCt : visitUrlCt,
                productCt : productCt,
                processList : (new Process()).getProcessList(),
                logs: logs
            });
        }
    });
    //---------------------------------------- new process
    app.get('/newProcess', function(req, res){
        var process = new Process();
        if(process.getProcessList().length<4){
            process.start();
        }
        res.redirect("/");
    });
    //---------------------------------------- get urls
    app.get('/urls', function(req,res){
        UrlInfo.find({}, function(err, list){
            if(err){
                res.render("error.ejs",{
                    error: err
                });
            }else{
                res.render('urls.ejs',{
                    urls : list
                });
            }
        }).sort({update: "desc"}).limit(1000);
    });
    //---------------------------------------- get product list
    app.get('/products', function(req,res){
        Product.find({}, function(err, list){
            if(err){
                res.render("error.ejs",{
                    error: err
                });
            }else{
                res.render('products.ejs',{
                    products : list
                });
            }
        }).sort({update: "desc"}).limit(1000);
    });
    //---------------------------------------- get product list
    app.get('/product', function(req,res){
        var params = getParamenter(req);
        var md5 = params.md5;
        Product.findOne({md5: md5}, function(err, result){
            if(err){
                res.render("error.ejs",{
                    error: err
                });
            }else{
                res.json(result.data);
            }
        });
    });
}

function isEmptyObject(obj) {
    return !Object.keys(obj).length;
}
function getParamenter(req){
    return isEmptyObject(req.body) ? req.query : req.body;
}