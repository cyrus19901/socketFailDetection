const signalR = require('signalr-client')
const zlib = require('zlib')
const _ = require('lodash')
var fs = require('fs');
// Defaulting reconnect to 10 seconds
const client = new signalR.client('wss://bittrex.com/signalr', ['c2'],10)

let market = 'USD-BTC'
var stream_log = fs.createWriteStream('Nonce_file.txt');
var stream_error = fs.createWriteStream('Nonce_file_error.txt');
var reconnected_log = fs.createWriteStream('Reconnected_log.txt');
var BindingError_log = fs.createWriteStream('BindingError_log.txt');
var ConnectionError_log = fs.createWriteStream('ConnectionError_log.txt');
let _nonce = 0

/** Websocket On Update Functions */
function on_public(__update) {
    let raw = new Buffer.from(__update, 'base64');
    zlib.inflateRaw(raw, function(err, inflated) {
        if (!err) {
            let obj = JSON.parse(inflated.toString('utf8'));
            let data = new Date() + '===========' + obj['N'] + '===============' + obj['M'] +"\n";
            // Log data in the error file if nonce are out of order.
            if (_nonce !=0 && _nonce+1 != obj['N']){
                let err = 'Last nonce lost for: '+obj['M']+ ' at ' + new Date() + ' last nonce: ' + _nonce + ' current Nonce being: ' + obj['N'] + "\n"; 
                stream_error.write(err);
            }
            stream_log.write(data);
            _nonce = obj['N']
        }
    })
}

// Initiate the websocket connection 
client.serviceHandlers.connected = function(connection) {

  console.log('connected')
  client.call('c2', 'SubscribeToExchangeDeltas', market)
  .done(function(err, result) {
    if (err) {
      return console.error(err)
    }
    if (result === true) {
      client.on('c2', 'uE', on_public)
    }
  })
}

client.serviceHandlers.connectFailed = function(error) {
    let data = 'Last connection failed at:'+ new Date() + 'with error:' + error ;
    // Logging any connection error in the file
    ConnectionError_log.write(data);
}

client.serviceHandlers.bindingError = function(error) {
    let data = 'Last binding failed at:'+ new Date() + 'with error:' + error ;
    // Logging any binding error in the file
    BindingError_log.write(data);
}

client.serviceHandlers.reconnected = function(reconnecting){
    // Logging any reconnection that occured in the file
    let data = 'Last reconnect happened at:'+ new Date() + 'with log:' + reconnecting ;
    reconnected_log.write(data);
}
client.serviceHandlers.reconnecting = function(retry){
    // Logging any reconnection that occured in the file
    let data = 'Last reconnect happened at:'+ new Date() + 'with log:' + retry ;
    reconnected_log.write(data);
    return false;
}