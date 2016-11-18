//----------------------------------------------------------------------------------------------------------------------
//                                              Constants
//----------------------------------------------------------------------------------------------------------------------
var START_URL = "http://www.ricardoeletro.com.br";
var INTERVAL = 200;
var STATUS_NEW = "new";
var STATUS_PROCESS = "process";
var STATUS_COMPLETE = "complete";
var STATUS_FAIL = "fail";

var headers = {
    "accept-charset" : "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
    "accept-language" : "en-US,en;q=0.8",
    "accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "user-agent" : "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36",
    "accept-encoding" : "gzip,deflate",
};

//----------------------------------------------------------------------------------------------------------------------
//
//----------------------------------------------------------------------------------------------------------------------
var request = require("request");
var cheerio = require('cheerio');
var parse   = require('url-parse');
var zlib    = require('zlib');
var md5     = require('md5');

var mongoose = require('mongoose');
var Product  = require('../models/Product');
var UrlInfo  = require('../models/UrlInfo');
var Log      = require('../models/Log');

var processList = [];
var urlmap = {};
//----------------------------------------------------------------------------------------------------------------------
//                                              Process
//----------------------------------------------------------------------------------------------------------------------
module.exports = function(){
    var me = this;
    this.id = new Date().getTime();
    this.status = "Create";
    this.startTime = new Date();
    this.lastUpdated = new Date();

    //-------------------------------------------------------- global
    this.getProcessList = function(){
        return processList;
    }
    //-------------------------------------------------------- add new url
    var addNewUrl = function(url){
        try{
            //check url
            if(url.substr(0,4)=="http"){
                if(url.substr(0,START_URL.length)!=START_URL) return;
            }else{
                if(url.substr(0,1)=="/"){
                    url = START_URL+url;
                }else{
                    url = START_URL+"/"+url;
                }
            }
            if(url.indexOf("?")>0){
                url = url.substr(0, url.indexOf("?"));
            }

            var md5_key = md5(url);
            if(urlmap[md5_key]) return;

            //add url
            var urlInfo = new UrlInfo();
            urlInfo.url = url;
            urlInfo.md5 = md5_key;
            urlmap[md5_key] = true;
            UrlInfo.count({md5: md5_key}, function(err, count){
                if(count>0) return;

                urlInfo.status = STATUS_NEW;
                urlInfo.save();
                print_log("find new url",url);
            });
        }catch(e){
            console.log(e);
            console.log(url);
        }

    }
    //------------------------------------------------------- get one url
    var getOneUrl = function(success, fail){
        UrlInfo.findOne({status:{$in: [STATUS_NEW, STATUS_FAIL]} }, function(err, result){
            if(err){
                fail(err);
            }else{
                success(result);
            }
        }).sort({update: "desc"});
    }
    //------------------------------------------------------ find new url
    var findNewUrl = function(){
        getOneUrl(function(urlInfo){
            if(!urlInfo){
                me.kill(); return;
            }
            // update urlInfo
            urlInfo.status = "processing";
            urlInfo.updated = new Date();
            urlInfo.save();

            // process url
            print_log("downloading url", urlInfo.url);
            requestWithEncoding(urlInfo.url, function(err, html) {
                if (err) {
                    print_log("download fail", urlInfo.url);

                    urlInfo.status = STATUS_FAIL;
                    urlInfo.updated = new Date();
                    urlInfo.save();

                    nextDo();
                }else{
                    print_log("download success" , urlInfo.url);
                    filterHtml(urlInfo, html)
                }
            });
        }, function(err){
            console.log(err);
            print_log("get url from db error","");

            me.kill();
        });
    }
    //------------------------------------------------------ next do
    var nextDo = function(){
        setTimeout(findNewUrl, INTERVAL);
    }
    //------------------------------------------------------ start process
    this.start = function(){
        processList.push(me);

        getOneUrl(function(urlInfo){
            if(!urlInfo){
                addNewUrl(START_URL);
            }
            nextDo();
        }, function(err){
            print_log(err,"");
            me.kill();
        });
    }
    //------------------------------------------------------- kill process
    this.kill = function(){
        for(var i=0; i<processList.length; i++){
            if(processList[i]==me){
                processList.splice(i,1);
            }
        }
        print_log("exit process","");
    }
    //------------------------------------------------------- http request
    var requestWithEncoding = function(reqUrl, callback) {
        var options = {
            url: reqUrl,
            headers: headers
        };
        var req = request.get(options);

        req.on('response', function(res) {
            var chunks = [];
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });

            res.on('end', function() {
                var buffer = Buffer.concat(chunks);
                var encoding = res.headers['content-encoding'];
                if (encoding == 'gzip') {
                    zlib.gunzip(buffer, function(err, decoded) {
                        callback(err, decoded && decoded.toString());
                    });
                } else if (encoding == 'deflate') {
                    zlib.inflate(buffer, function(err, decoded) {
                        callback(err, decoded && decoded.toString());
                    })
                } else {
                    callback(null, buffer.toString());
                }
            });
        });

        req.on('error', function(err) {
            callback(err);
        });
    }
    //------------------------------------------------------- http request
    var print_log = function(message, url){
        var log = new Log();
        log.process = me.id;
        log.message = message;
        log.url = url;
        log.save();
    }
    //------------------------------------------------------- Filter html
    var filterHtml = function(urlInfo, html){
        var $ = cheerio.load(html);
        //find urls
        $("a").each(function(){
            var url = $(this).attr("href");
            if(url) addNewUrl(url);
        });

        //find product
        try{
            var startStr = "<script>var dataLayer = ";
            var beginPos = html.indexOf(startStr);
            if(beginPos>0){
                beginPos += startStr.length;
                var endPos = html.indexOf(";</script>", beginPos);
                var dataLayerStr = html.substr(beginPos, endPos-beginPos);
                var dataLayer = JSON.parse(dataLayerStr);
                var item = dataLayer[0];
                if(item.productUrl){
                    var product = new Product();
                    product.url = item.productUrl;
                    product.md5 = md5(product.url);
                    product.data = item;
                    product.save();
                    print_log("find product", product.url);
                }
            }
        }catch(e){
        }


        //update db
        urlInfo.status = STATUS_COMPLETE;
        urlInfo.updated = new Date();
        urlInfo.save();

        nextDo();
    }

}