module.exports = {
    action1: action1,
    action1Promise: action1Promise,
    action2: action2,
    actions: {
        log1: log1,
        log2: log2
    },
    setN: function() {var n = 2; console.log('SET N TO '+n); return n;},
    selN: function(n,cb) {console.log('SEL'+this.x+'('+n+')'); if (n==this.x) cb(null,n); else cb(n,null)},
}


function action1Promise(input){
    return new Promise(function(resolve,reject){
        console.log('ACTION1P, input=',input);
        resolve(input + '.');
    });
}

function action1(input) {
    console.log('ACTION1, input=',input);
    return input + '.';
}

function action2(input) {
    console.log('ACTION2, input=',input);
    return input + '.';
}

function log1(input) {
    console.log('ACTIONS.LOG1, x=',this.x,', input=',input);
    return input + '.';
}

function log2(input, cb) {
    console.log('ACTIONS.LOG2, input=',input);
    cb(null, input + '.');
    return 'WRONG INPUT';
}
