var protocal;
// @ts-ignore
request = require('request');
var request;

module.exports = async function (hostname, port, adapter, addedData, password,command, cb) {
    try{
        var milliseconds = Date.now();
        var commands = {
            info_version: '%400%3FVN%0D',
            info_zone_ch: '%400%3FPXOTXXXXXCH%0D',
            info_zone_master_vol: '%400%3FPXOTXXXXXLV%0D',
            info_zone_source_vol: '%400%3FPXOTXXXXXML%0D',
            info_zone_mic_vol: '%400%3FPXOTXXXXXSL%0D',
            info_zone_source: '%400%3FPXOTXXXXXSS%0D',
            info_zone_mic: '%400%3FPXMLXXXXXILYYYYY%0D',
            set_zone_master_vol: '%400PXOTXXXXXLVYYYYY%0D',
            set_zone_source_vol: '%400PXOTXXXXXSLYYYYY%0D',
            set_zone_mic_vol: '%400PXOTXXXXXMLYYYYY%0D',
            set_zone_source: '%400PXOTXXXXXSSYYYYY%0D',
            set_zone_mic: '%400PXMLXXXXXILYYYYY%0D',
        };
        var split = {
            info_version: '@0VN',
            info_zone_ch: '@0PXOT',
            info_zone_master_vol: '@0PXOT',
            info_zone_source_vol: '@0PXOT',
            info_zone_mic_vol: '@0PXOT',
            info_zone_source: '@0PXOT',
            info_zone_mic: '@0PXML',
        }
        adapter.log.debug(command);
        var final_command = commands[command];
        if(addedData){
            if(isNaN(addedData)){
                if(addedData.includes("-|-")){
                    var options = addedData.split("-|-");
                    if(options[0]){
                        final_command = final_command.replace("XXXXX",options[0]);
                    }
                    if(options[1]){
                        final_command = final_command.replace("YYYYY",options[1]);
                    }
                    if(options[2]){
                        final_command = final_command.replace("RRRRR",options[2]);
                    }
                    if(options[3]){
                        final_command = final_command.replace("SSSSS",options[3]);
                    }
                } else {
                    final_command = final_command.replace("XXXXX", addedData.toString());
                }
            } else {
                final_command = final_command.replace("XXXXX", addedData.toString());
            }
        }
        if(port === '443'){
            protocal = 'https://';
        } else{
            protocal = 'http://';
        }
        final_command = "command=" + final_command;
        adapter.log.debug("command: " + final_command);
        if(final_command){
            try{
                request.post({
                    url: protocal + hostname + '/api.cgi',
                    headers:  { 
                        'Content-Length': final_command.length,
                        'Content-Type': 'text/plain' 
                    },
                    body: final_command,
                }, function(error, response, body){
                    adapter.log.debug("Resonse Code: " + response.statusCode);
                    adapter.log.debug("Resonse: " + JSON.stringify(response));
                    if(error){
                        adapter.log.debug("Error: " + error.message);
                    }
                    var bodyFixed = "";
                    var lines = body.split('\r');
                    lines.forEach(function(line){
                        if(!line.includes("0PXSTTM")){
                            bodyFixed = bodyFixed + " " + line;
                        }
                    });
                    if(split[command]){
                        var strSplit = bodyFixed.split(split[command])[1];
                        if(strSplit){
                            adapter.log.debug("data: " + strSplit);
                            cb(strSplit);
                        } else {
                            adapter.log.debug("data: " + bodyFixed);
                            cb(bodyFixed);
                        }
                    } else {
                        adapter.log.debug("data: " + bodyFixed);
                        cb(bodyFixed);  
                    }
                });
            }
            catch(err) {
                adapter.log.debug("tryError: " + JSON.stringify(err));
            }
        }
    }
    catch(errOut) {
        adapter.log.debug("tryOutError: " + JSON.stringify(errOut));
    }
};