// Execute examples to do some simple tests

var BehaviorTree = require('./lib/behavior.js');

var tree = BehaviorTree.create(require('./examples/game.js'))
if (tree.error) {
    console.log('ERROR:', tree.error);
    throw tree.error;
} else {
    tree.run({doorStatus: 'open'})
    .then(function() {return tree.run({doorStatus: 'closed'})})
    .then(function() {return tree.run({doorStatus: 'locked'})})
    .then(function() {return tree.run({doorStatus: 'kickable'})})
    .then(function() {return tree.run({doorStatus: 'rock'})})
    .catch(function(err) {
        console.log('EXCEPTION:', err)
    })
}
