module.exports = (function(){

    

    module.exports.running = false;

    module.exports.queue = [];

    module.exports.add_function = function(callback) { 
        var _this = this;
        //add callback to the queue
        this.queue.push(function(){
            var finished = callback();
            if(typeof finished === "undefined" || finished) {
               //  if callback returns `false`, then you have to 
               //  call `next` somewhere in the callback
               _this.next();
            }
        });

        if(!this.running) {
            // if nothing is running, then start the engines!
            this.next();
        }

        return this; // for chaining fun!
    }

    module.exports.next = function(){
        this.running = false;
        //get the first element off the queue
        var shift = this.queue.shift(); 
        if(shift) { 
            this.running = true;
            setTimeout(function(){
                shift(); 
            },500);

        }
    }

    return module.exports;

})();