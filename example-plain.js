// Execute examples to do some simple tests

var BehaviorTree = require('./lib/behavior.js');
var actions = require('./examples/plain-actions.js')
var path = require('path');

// Execute a tree passing tree options and an input, then show output
function executeTree(options, input) {
    var tree = BehaviorTree.create(options)

    if (tree.error) {
        console.log(tree.error);
        throw tree.error;
    } else {
        console.log('START');
        return tree.run(input)
            .then(function success(result){
                console.log('SUCCESS STOP WITH RESULT ' + result);
            },function failure(result){
                console.log('FAILURE STOP WITH RESULT ' + result);
            });
        }
}

// Execute tree defined in YAML file
executeTree({
    rootFormat: 'yamlfile',
    root: path.join(__dirname,'examples','plain-example.yaml'),
    actions: actions
}, 'a1')

// Execute tree defined in module object
.then(function () {
    executeTree({
        rootFormat: 'object',
        root: require('./examples/plain-example.js'),
        actions: actions
    }, 'a2')
})