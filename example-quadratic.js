// Purpose: 
//      Find the roots of the equation: a*x^2 + b*x + c = 0
//      Demonstrate how to organize complex code

let BehaviorTree = require('./lib/behavior.js');

let tree = BehaviorTree.create(require('./examples/quadratic.js'))

let solveFor = (coefficients) => () => tree.run(coefficients)

if (tree.error) {
    console.log('ERROR:', tree.error);
    throw tree.error;
} else {
    // Run
    tree.run({a: 1, b: 0, c: -1})               // Real roots
    .then(solveFor({a: 2, b: 4, c: -6})) // Real roots
    .then(solveFor({a: 1, b: -4, c: 4})) // Double root
    .then(solveFor({a: 5, b: 2, c: 2}))  // Complex roots
    .then(solveFor({a: 0, b: 1, c: -4})) // 1st order
    .then(solveFor({a: 0, b: 0, c: 0}))  // All solutions
    .then(solveFor({a: 0, b: 0, c: 4}))  // No solution
    .catch(function(err){
        console.log('ERROR:');
        console.log(err);
    });
}
