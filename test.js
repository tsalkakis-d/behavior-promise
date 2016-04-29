var bt = require('./lib/behavior.js');
var actions = require('./example/actions.js')
var root = require('./example/example.js')
var path = require('path');


var tree = bt.create({
    // rootFormat: 'object',
    // root: root,
    rootFormat: 'yamlfile',
    root: path.join(__dirname,'example','example.yaml'),
    actions: actions
})

if (tree.error)
    console.log(tree.error);
else {
    console.log('START');
    tree.run('a1')
        .then(function success(result){
            console.log('SUCCESS STOP WITH RESULT '+result);
        },function failure(result){
            console.log('FAILURE STOP WITH RESULT '+result);
        });
    }


