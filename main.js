"use strict";

const denon = require('./lib/denon');
const queueDenon = require('./lib/queue');
// @ts-ignore
var utils = require('@iobroker/adapter-core'); // Get common adapter utils
// @ts-ignore
//var adapter = utils.Adapter('pureav');
var host, port, password, polltime;
var power, outputSource, requestNumber, zone, mic;
var zones = [1,3,5,7];
var mics = [1,2,3,4,5,6,7,8];
let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
         name: 'denon-mixer',
         stateChange: function (id, state) {
            // Warning, state can be null if it was deleted
            adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
            if (state && !state.ack) {
                var ids = id.split(".");
                var dataobject = ids[ids.length - 1].toString();
                if(ids[ids.length - 2].toString().includes("Zone")){
                    zone = ids[ids.length - 2].toString().split("-")[1];
                } else if(ids[ids.length - 2].toString().includes("Mic")){
                    mic = ids[ids.length - 2].toString().split("-")[1];
                    zone = ids[ids.length - 3].toString().split("-")[1];
                }
                adapter.log.debug("zone: " + zone);
                adapter.log.debug("mic: " + mic);
                adapter.log.debug("dataobject: " + dataobject);
                switch (dataobject) {
                    case 'MasterVolume':
                        if(zone){
                            queueDenon.add_function(function(){
                                denon(host,port,adapter,zone + '-|-' + state.val,"","set_zone_master_vol", function (data){
                                    //adapter.log.debug('device response set lv:' + data);
                                });
                            });
                        }
                    break;
                    case 'SourceVolume':
                        if(zone){
                            queueDenon.add_function(function(){
                                denon(host,port,adapter,zone + '-|-' + state.val,"","set_zone_source_vol", function (data){
                                    //adapter.log.debug('device response set lv:' + data);
                                });
                            });
                        }
                    break;
                    case 'MicVolume':
                        if(zone){
                            queueDenon.add_function(function(){
                                denon(host,port,adapter,zone + '-|-' + state.val,"","set_zone_mic_vol", function (data){
                                    //adapter.log.debug('device response set lv:' + data);
                                });
                            });
                        }
                    break;
                    case 'Source':
                        if(zone){
                            queueDenon.add_function(function(){
                                denon(host,port,adapter,zone + '-|-' + state.val,"","set_zone_source", function (data){
                                    //adapter.log.debug('device response set lv:' + data);
                                });
                            });
                        }
                    break;
                    case 'Level':
                        if(zone){
                            var val = "Inf";
                            if(state.val){
                                val = "5";
                            }
                            queueDenon.add_function(function(){
                                denon(host,port,adapter,mic + '-|-' + zone + val,"","set_zone_mic", function (data){
                                    //adapter.log.debug('device response set lv:' + data);
                                });
                            });
                        }
                    break;
                }
                adapter.log.info('changed ' + dataobject + ' to ' + state.val);
            }
         },
         unload: function(callback){
            try {
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
         },
         objectChange: function(callback){
            // Warning, obj can be null if it was deleted
            // @ts-ignore
            adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(obj)); 
         },
         ready: function(){
          main();
         },


    });
    adapter = new utils.Adapter(options);

    return adapter;
};

async function main() {
    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    host = adapter.config.hostname;
    port = adapter.config.port;
    polltime = adapter.config.polltime;
    password = adapter.config.password;
    adapter.log.info('config host: ' + adapter.config.hostname);
    adapter.log.info('config port: ' + adapter.config.port);
    // Check communication
    queueDenon.add_function(function(){
        denon(host,port,adapter,"","","info_version",function (data){
            adapter.log.debug('device response:' + data);
        });
    });
    zones.forEach(function(zone){
        queueDenon.add_function(function(){
            denon(host,port,adapter,zone,"","info_zone_ch", function (data){
                adapter.setObjectNotExists('Device.Zone-' + zone + '-exists', {
                    type: 'state',
                    common: {name: 'Zone ' + zone + ' Exists', type: 'bool', role: 'value', read: true, write: true},
                    native: {}
                });
                adapter.getState ('Zone ' + zone + ' Exists', function (err, adapter_state) {
                    if(adapter_state && adapter_state.val != true){
                        adapter.setState('Device.Zone-' + zone + '-exists', {val: true, ack: false});
                    }
                });
                if(data.includes("MN")){
                    var zoneAdd = zone + 1;
                    adapter.setObjectNotExists('Device.Zone-' + zoneAdd + '-exists', {
                        type: 'state',
                        common: {name: 'Zone ' + zoneAdd + ' Exists', type: 'bool', role: 'value', read: true, write: true},
                        native: {}
                    });
                    adapter.getState ('Zone ' + zoneAdd + ' Exists', function (err, adapter_state_add) {
                        if(adapter_state_add && adapter_state_add.val != true){
                            adapter.setState('Device.Zone-' + zoneAdd + '-exists', {val: true, ack: false});
                        }
                    });
                    if(zones.indexOf(zoneAdd) == -1){
                        zones.push(zoneAdd);
                    }
                } else if (data.includes("ST")){
                    var zoneAdd = zone + 1;
                    adapter.getState ('Zone ' + zoneAdd + ' Exists', function (err, adapter_state_add) {
                        if(adapter_state_add && adapter_state_add.val != false){
                            adapter.setState('Device.Zone-' + zoneAdd + '-exists', {val: false, ack: false});
                        }
                    });
                    var index = zones.indexOf(zoneAdd);
                    if (index !== -1) zones.splice(index, 1);
                }
            });
        });
    });
    

    // defining dataobjects
    adapter.setObjectNotExists('Device.Version', {
        type: 'state',
        common: {name: 'Device Version', type: 'string', role: 'value', read: true, write: true},
        native: {}
    });
   
// Device Power State
    
    
    
// // Polling dynamic infomration
var pollinfo = setInterval(function () {
    zones.forEach(function(zone){
        adapter.log.debug("zone-" + zone);
    });
    zones.forEach(function(zone){
        //Master Volume
        queueDenon.add_function(function(){
            denon(host,port,adapter,zone,"","info_zone_master_vol", function (data){
                if(data.includes("LV")){
                    adapter.setObjectNotExists('Device.Zone-' + zone + '.MasterVolume', {
                        type: 'state',
                        common: {name: 'Device.Zone-' + zone + '.MasterVolume', type: 'state', role: 'level.volume', read: true, write: true},
                        native: {}
                    });
                    adapter.getState ('Device.Zone-' + zone + '.MasterVolume', function (err, adapter_state) {
                        if(!adapter_state){
                            adapter.setState('Device.Zone-' + zone + '.MasterVolume', {val: data.split("LV")[1], ack: false});
                        }
                        if(adapter_state && adapter_state.val != data.split("LV")[1]){
                            adapter.setState('Device.Zone-' + zone + '.MasterVolume', {val: data.split("LV")[1], ack: false});
                        }
                    });
                }
            });
        });
        // Mic volume
        queueDenon.add_function(function(){
            denon(host,port,adapter,zone,"","info_zone_mic_vol", function (data){
                if(data.includes("ML")){
                    adapter.setObjectNotExists('Device.Zone-' + zone + '.MicVolume', {
                        type: 'state',
                        common: {name: 'Device.Zone-' + zone + '.MicVolume', type: 'state', role: 'level.volume', read: true, write: true},
                        native: {}
                    });
                    adapter.getState ('Device.Zone-' + zone + '.MicVolume', function (err, adapter_state) {
                        if(!adapter_state){
                            adapter.setState('Device.Zone-' + zone + '.MicVolume', {val: data.split("ML")[1], ack: false});
                        }
                        if(adapter_state && adapter_state.val != data.split("ML")[1]){
                            adapter.setState('Device.Zone-' + zone + '.MicVolume', {val: data.split("ML")[1], ack: false});
                        }
                    });
                }
            });
        });
        // Source volume
        queueDenon.add_function(function(){
            denon(host,port,adapter,zone,"","info_zone_source_vol", function (data){
                if(data.includes("SL")){
                    adapter.setObjectNotExists('Device.Zone-' + zone + '.SourceVolume', {
                        type: 'state',
                        common: {name: 'Device.Zone-' + zone + '.SourceVolume', type: 'state', role: 'level.volume', read: true, write: true},
                        native: {}
                    });
                    adapter.getState ('Device.Zone-' + zone + '.SourceVolume', function (err, adapter_state) {
                        if(!adapter_state){
                            adapter.setState('Device.Zone-' + zone + '.SourceVolume', {val: data.split("SL")[1], ack: false});
                        }
                        if(adapter_state && adapter_state.val != data.split("SL")[1]){
                            adapter.setState('Device.Zone-' + zone + '.SourceVolume', {val: data.split("SL")[1], ack: false});
                        }
                    });
                }
            });
        });
        queueDenon.add_function(function(){
            denon(host,port,adapter,zone,"","info_zone_source", function (data){
                if(data.includes("SS")){
                    adapter.setObjectNotExists('Device.Zone-' + zone + '.Source', {
                        type: 'state',
                        common: {name: 'Device.Zone-' + zone + '.Source', type: 'state', role: 'value', read: true, write: true},
                        native: {}
                    });
                    adapter.getState ('Device.Zone-' + zone + '.Source', function (err, adapter_state) {
                        if(!adapter_state){
                            adapter.setState('Device.Zone-' + zone + '.Source', {val: data.split("SS")[1], ack: false});
                        }
                        if(adapter_state && adapter_state.val != data.split("SS")[1]){
                            adapter.setState('Device.Zone-' + zone + '.Source', {val: data.split("SS")[1], ack: false});
                        }
                    });
                }
            });
        });
        // Mic level in each zone
        mics.forEach(function(mic){
            queueDenon.add_function(function(){
                denon(host,port,adapter,mic + "-|-" + zone,"","info_zone_mic", function (data){
                    var mic_level = data.replace(mic + 'IL' + zone,"");
                    if(mic_level.includes("Inf")){
                        mic_level = -90.0;
                    }
                    if(data.includes("IL")){
                        adapter.setObjectNotExists('Device.Zone-' + zone + '.Mic-' + mic + '.Level', {
                            type: 'state',
                            common: {name: 'Device.Zone-' + zone + '.Mic-' + mic + '.Level', type: 'state', role: 'value', read: true, write: true},
                            native: {}
                        });
                        adapter.getState ('Device.Zone-' + zone + '.Mic-' + mic + '.Level', function (err, adapter_state) {
                            if(!adapter_state){
                                adapter.setState('Device.Zone-' + zone + '.Mic-' + mic + '.Level', {val: mic_level, ack: false});
                            }
                            if(adapter_state && adapter_state.val != mic_level){
                                adapter.setState('Device.Zone-' + zone + '.Mic-' + mic + '.Level', {val: mic_level, ack: false});
                            }
                        });
                    }
                });
            });
        });
    });
}, polltime);


    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    // checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });
}
    
    // If started as allInOne/compact mode => return function to create instance
// @ts-ignore
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
