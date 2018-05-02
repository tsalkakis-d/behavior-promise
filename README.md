# behavior-promise
Organize complex code execution in Javascript using behavior trees.

**Latest news**: Parallel container is available (Documentation only, NOT working yet!)

For an introduction in behavior trees, you can check the [Wikipedia article](http://en.wikipedia.org/wiki/Behavior_tree) or [this page](http://guineashots.com/2014/08/10/an-introduction-to-behavior-trees-part-2/).

For suggestions, feel free to contact the author <mailto:dimtsalk@gmail.com>.
        

- [Features](#features)
- [Installation](#installation)
- [Definitions](#definitions)
- [Examples](#examples)
- [API](#api)
- [Scopes](#scopes)
- [Parallel execution](#parallel-execution)
- [Todo](#todo)

## Features
- Mix promises, callbacks and plain functions without conversion
- Dynamically select which actions to execute
- Local variables in nodes (instead of blackboard implementation)
- Scales well in complex applications without losing control
- Adapted to use functions from existing objects with almost zero cost
- Trees may be loaded from JS objects, JSON files or strings, YAML files or strings

## Installation
In Node.js:
```bash
$ npm install --save behavior-promise
```
## Definitions
- A behavior **tree**:
	- Contains a collection of **nodes**
	- Has a **root** node. All other nodes are descendants of the root node
	- Must be **prepared** before running
	- Can **run** its nodes as a Promise and then return a **Success** or a **Failure** result
- A **node**:
	-  Can run as a Promise and then return a Success or a Failure result
    -  Can have children nodes and run them in a specific way (depends on node type)
	-  May be in one of the **states**: Running, finished with Success, finished with Failure
	-  Accepts an optional **input argument**
	-  Returns an optional **output value**
	-  When run, its output value becomes the input argument of the next node to run
	-  Can have a **scope** containing private variables, available to the node and its descentants
	-  May be of type:
		- **Action**: Node is actually an external or internal Javascript function that:
			-  Checks for a condition or performs a (probably time consuming) operation.
			-  Returns a Success or a Failure result
			-  May be executed as a:
				- **Promise** object, which succeeds when it is fulfilled and fails when it is rejected
				- **Callback** function(error,result), which succeeds when it does not return an error and fails otherwise
				- **Boolean** function(), which succeeds when it returns true and fails otherwise
				- **Plain** function(), which succeeds when it finishes without an exception and fails otherwise
		- **Container**: Node contains one or more child nodes. More specific, a container may be:
			- A **Sequence** node, which executes sequentially its child nodes until one of them fails
			- A **Selector** node, which executes sequentially its child nodes until one of them succeeds
            - A **Parallel** node, which executes all of its child nodes in parallel, until max failures of max successes occur
		- **Decorator**: Node that contains a single child node and shapes its result. More specific, a decorator may be:
			- An **Inverter** node, which executes its child node and then reverses the success/failure result
			- A **Success** node, which executes its child node then returns always Success
			- A **Failure** node, which executes its child node and then returns always Failure


## Examples

Example 1. A simple example (prints '1', then prints 'Done'):

```js
var behavior = require('behavior-promise');

// Prepare the tree
var tree = behavior.create({
    root: {
    	seq: [
            {action:'action1'},
            {action:'action2'},
            {action:'action3'}
        ]
    },
    actions: {
        action1: function() {return 1},
        action2: function(x) {console.log(x)},
        action3: function() {console.log('Done')}
    }
});
tree.run();
```

Example 2. An example of a game AI attempting to enter a room:

```js
var behavior = require('behavior-promise');
var tree = behavior.create({
    root: {
        seq: [
            // Read initial conditions
            'readInput',
            // Either enter or abandon
            {sel: [
                // Try various methods to open the door
                {seq: [
                    {sel: [
                        'door.isOpen', // Check if door is already open
                        {seq:['door.open', 'door.isOpen']}, // If failed, try to open the door
                        {seq: ['door.unlock', 'door.open', 'door.isOpen']}, // If failed, try to unlock the door, then open
                        {seq: ['door.kick', 'door.isOpen']} // If failed, try to kick the door
                    ]},
                    // Enter the room
                    'room.moveInto'	
                ]},
                // Could not open the door, must abandon the plan of entering this room
                'room.abandon'
            ]},
        ],
    },
    actions: {
        readInput: function () {/*..*/},
        door: {
            isOpen: function(){/*...*/},
            isLocked: function(){/*...*/},
            open: function(){/*...*/},
            unlock: function(){/*...*/},
            kick: function(){/*...*/}
        },
        room: {
        	moveInto: function(){/*...*/},
        	abandon: function(){/*...*/}
        },
    }
});

// Run the tree
if (tree.error)
    console.log(tree.error);
else {
    tree.run({doorStatus: 'open'})
    .then(function() {return tree.run({doorStatus: 'closed'})})
    .then(function() {return tree.run({doorStatus: 'locked'})})
    .then(function() {return tree.run({doorStatus: 'kickable'})})
    .then(function() {return tree.run({doorStatus: 'rock'})})
    .catch(function(err) {
        console.log('EXCEPTION:', err)
    })
}
```

Example 3. A 2nd order equation solver with real examples:

```js
// Purpose: 
//      Find the roots of the equation: a*x^2 + b*x + c = 0
//      Demonstrate how to organize complex code

var behavior = require('behavior-promise');

// To make the tree more readable, define some intermediate branches with 
// specific names

// function to create and return a tree branch with the following functionality:
//      If output of node <expr> satisfies node <equals> as input, 
//      then run node <thenDo>, else run node <elseDo>
const ifNode = ([expr, equals, thenDo, elseDo]) => ({sel:[{seq:[expr, equals, thenDo]}, elseDo]})

let _allOrNone = ifNode(['get.c', 'is.zero', 'calculate.allSolutions', 'calculate.noSolution'])
let _firstOrder = ifNode(['get.b', 'is.zero', _allOrNone, 'calculate.firstOrder'])
let _doubleOrComplex = ifNode(['get.discriminant', 'is.zero', 'calculate.doubleRoot', 'calculate.complexRoots'])
let _realDoubleOrComplex = ifNode(['get.discriminant', 'is.positive', 'calculate.realRoots', _doubleOrComplex])
let _secondOrder = {seq:['calculate.discriminant', _realDoubleOrComplex]}
let _solve = ifNode(['get.a', 'is.zero', _firstOrder, _secondOrder])

// Build the tree

var quadratic = behavior.create({
    
    // Define the tree
    root: {                                         
        debug: false,
        scope: { // Equation variables:
            // Input vars: Equation coefficients
            in:     { a:null, b:null, c:null},      
            // Intermediate vars: Discriminant, discriminant root
            med:    { d:null, dr: null },           
            // Output vars: Roots, description of solution
            out:    { roots:[], description: ''}   
        },
        seq: [ // Main sequence
            'method.readInputs',
            'method.displayInputs',
            _solve,
            'method.displayResults'
        ]
    },
    
    // Define the possible actions
    actions: {
        
        // I/O modules
        method: {
            readInputs: function(args) {
                this.in.a = args.a; 
                this.in.b = args.b; 
                this.in.c = args.c;
                this.out.roots = [];
                console.log('Solving for a=',this.in.a,
                    ', b=',this.in.b,', c=',this.in.c);
            },
            displayInputs: function(args) {
                console.log(`a=${this.in.a}, b=${this.in.b}, c=${this.in.c}`)
            },
            displayResults: function() {
                let s = this.out.description
                if (this.out.roots.length > 0)
                    s = `${s} (${this.out.roots.join(', ')})`
                console.log(s)
                console.log()
            },
        },
        
        // Condition checkers
        is: {
            positive:       function(x) { if (!(x>0)) throw false; },
            zero:           function(x) { if (!(x==0)) throw false; },
        },
        
        // Value getters
        get: {
            a:              function()  { return this.in.a; },
            b:              function()  { return this.in.b; },
            c:              function()  { return this.in.c; },
            discriminant:   function()  { return this.med.d; }
        },
        
        // Calculate modules
        calculate: {
            discriminant: function() {
                this.med.d = this.in.b*this.in.b-4*this.in.a*this.in.c;
                // console.log('Discriminant = ',this.med.d);
            },
            firstOrder: function() {
                this.out.description = 'First order solution';
                this.out.roots.push(-this.in.c/this.in.b);
            },
            realRoots: function() {
                this.out.description = 'Real roots';
                this.med.dr = Math.sqrt(this.med.d); 
                this.out.roots.push((-this.in.b-this.med.dr)/(2*this.in.a)); 
                this.out.roots.push((-this.in.b+this.med.dr)/(2*this.in.a)); 
            },
            complexRoots: function() {
                this.out.description = 'Complex roots';
                this.med.dr = Math.sqrt(-this.med.d); 
                var real = -this.in.b/(2*this.in.a);
                var imagp = Math.abs(this.med.dr/(2*this.in.a));
                this.out.roots.push( real + '+i'+ imagp);
                this.out.roots.push( real + '-i'+ imagp);
            },
            doubleRoot: function() {
                this.out.description = 'Double root';
                this.out.roots.push(-this.in.b/(2*this.in.a));
            },
            allSolutions: function() {
                this.out.description = 'Any number is a solution';
            },
            noSolution: function() {
                this.out.description = 'There are no solutions';
            },
        },
    }
});

let solveFor = (coefficients) => () => tree.run(coefficients)

// Run
tree.run({a: 1, b: 0, c: -1})        // Real roots
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

```


## API

### Module object
#### .create(config)
- ##### Description
    - Initializes a tree and prepares it for execution
- ##### Input
    - **config** (Required)
        - Defines the tree creation. 
        - Object with the following properties:
        - **.root** (Required)
            - The root node of the tree, containing all nodes. May be an object or a string:
                - If it is an **object**, then it is assumed to be a **Node** object described below
                - If it is a **string**, then it is parsed according to `rootFormat`
        - **.rootFormat** (Optional)
            - Defines the way to parse the `root` property above, in order to build the tree.
            - Default value:
                - If `root` is an object, then default rootFormat is `'object'`
                - If `root` is a string, then default rootFormat is `'json'`
            - Value may be one of the following strings:
                - **'object'**: `root` (and its children) is already a tree object. Do not parse it
                - **'json'**: `root` is a JSON string. Parse it to get the tree object
                - **'jsonfile'**: `root` is the filename of a JSON text file. Load and parse it to get the tree object
                - **'yaml'**: `root` is a YAML text string. Parse it to get the tree object
                - **'yamlfile'**: `root` is the filename of a YAML text file. Load and parse it to get the tree object
        - **.actions** (Required)
            An object containing all the available actions as properties.
            For each property:
            - Property **key** is the action path key (see run)
            - Property **value** is either a function (the action) or an object containing more properties
- ##### Output
    - **On success**:
    Returns a **Tree** object (described below)
    - **On error:**
    Returns a **Tree** object, where tree.error is set to a short string describing the error

### Tree object
#### .run(input)
- ##### Description
    - Runs (executes) the tree, starting from the root node
- ##### Input
    - **input** (Optional)
    An optional single argument to pass to the root node
- ##### Output
    - Returns a **promise** that will execute the whole tree and:
        - On **Success**:
            The promise will be fulfilled and will return the output value of the last node executed
        - On **Failure**:
            The promise will be rejected and will return -as an error- the output value of the last node executed
#### .error
- ##### Description
    - Property to indicate that an error occurred during tree creation:
        - If an error occurred during tree creation, property is set to a short string describing the error
        - If no error occurred, property is set to null

### Node object
- ##### Description
    - Object with the following properties (all optional):
        - **.type** (Optional):<br>
        A string indicating the node type.<br>
        May be one of: 'action','seq','sel','invert','success','failure'.<br>
        If no type is given but node has also a type specific property (`action`, `seq`, `sel`, `inver`, `success`, `failure`), then node type is concluded from the property key.<br>
        If no type is given and there is no type specific property but there is a `nodes` property, then node type is `seq`.<br>
        - **.scope** (Optional):<br>
        A scope object, containing a set of local variables as properties.<br> 
        Variables are accessible from actions of this node and of its child nodes.<br>
        If scope has a property with name 'var', then an action can access the property using this.var<br>
        An action can access the variables of its scope and of all its parent nodes scopes as if they were defined in one large scope.<br>
        In order to avoid confusion, it is considered an error to have a property with the same name in a node scope and in any of its children nodes scope.<br>
        - **.title** (Optional):<br>
        A string describing this node<br>
        Useful for editing/viewing/debugging the tree<br>
        - **.actionType** (Optional):<br>
        If node is an action, define here the action type.<br>
        If node is not an action, define here the default action type of the children nodes.<br>
        May be one of : `promise`,`callback`,`boolean`,`plain` (see action for definitions).<br>
        Default is going up parent actionType. If `actionType` is not found and no children specific property is given, then actionType='plain'.<br>
        - **.action** (Optional):
            - Action to execute.<br>
            - May be a word string, an object path string or a function:
               - If word string (AAAA), execute the function from tree.config.actions[AAAA]
               - If object path string (AAA.BBB.CCC), execute the function from tree.config.actions[AAA][BBB][CCC]
               - If function, execute directly this function
            - The function will be invoked according to the rules of the specified actionType:
                - If actionType is **promise**:<br>
                    Invoke a promise function<br>
                    If rejected or exception occurs, return failure.<br>
                    If fulfilled, return success<br>
                - If actionType is **callback**:<br>
                    Invoke a function f(input,cb)<br>
                    input is an optional argument<br>
                    cb is a callback function of type cb(err,result) to call when done<br>
                    Success is returned when err is null and no exception occurs<br> 
                    Failure is returned when err is not null or an exception occurs<br>
                - If actionType is **boolean**:<br>
                    Invoke a function f(input)<br>
                    input is an optional argument<br>
                    When done, function must return a true/false result.<br> 
                    If result = false or exception occurs, return failure.<br> 
                    If result = true, return success<br>
                - If actionType is **plain**:<br>
                    Invoke a plain function f(input)<br>
                    input is an optional argument<br>
                    When done, function must just return.<br> 
                    Success is returned when no exception occurs<br>
                    Failure is returned when an exception occurs<br>
        - **.seq** (Optional):<br>
        Sequence. An array with child nodes to execute in sequence.<br>
        When a failure occurs in a child node, stop the sequence and return a failure.<br>
        If all nodes succeeded, return a success
        - **.sel** (Optional):<br>
        Priority selector. An array with nodes to select one.<br>
        Try to execute all child nodes in sequence, from first to last.<br>
        When a child node succeeds, stop the sequence and return immediately success.<br>
        When a child node fails, try the next node in sequence.<br>
        If all nodes failed, return a failure.<br>
        - **.par** (Optional):<br>
        Parallel execution. An array with nodes to run in parallel.<br>
        Execute all child nodes in parallel, starting them at the same time.<br>
        When (maxSuccess) nodes end with a success, stop and return with a success.<br>
        When (maxFailure) nodes end with a failure, stop and return with a failure.<br>
        When neither maxSuccess nor maxFailure trigger but all child nodes return, return the result of the last child node<br>
        The output value of the parallel container will be the output value of the last child node that caused the success or failure.<br>
        - **.maxSuccess** (Optional):<br>
            - When set inside a parallel or a sequence container:
            Defines how many of its child nodes must end with success in order for the container to end with a success. 
            May be:
                - A number (1,2,3,...), indicating how many child nodes must end with a success in order to trigger a success
                - true, indicating that all child nodes must end with a success in order to trigger a success
                - false, indicating that container should not check for maxSuccess
        Default value is false (do not check maxSuccess)
        - **.maxFailure** (Optional):<br>
            - When set inside a parallel or a selector container:
            Defines how many of its child nodes must end with failure in order for the container to end with a failure. 
            May be:
                - A number (1,2,3,...), indicating how many child nodes must end with a failure in order to trigger a failure
                - true, indicating that all child nodes must end with a failure in order to trigger a failure
                - false, indicating that container should not check for maxFailure
            Default value is false (do not check maxFailure)
        - **.waitForMe** (Optional):<br>
        If set to true in a child node of a parallel container, then the container will wait for this child node to end before returning with the result.<br> 
        Else, the container may return before this node returns.<br> 
        - **.waitForAll** (Optional):<br>
        If set to true in a parallel container, then the container will wait for all of its child nodes to end before returning with the result.<br> 
        Else, the container may return before all of its child nodes return.<br> 
        - **.invert** (Optional):<br>
        Invert decorator. Execute the child node, reverse its result (success<->failure) and return it.
        - **.success** (Optional):<br>
        Success Decorator. Execute the child node and return success, no matter what the child node returned.
        - **.failure** (Optional):<br>
        Failure Decorator. Execute the child node and return failure, no matter what the child node returned
        - **.nodes** (Optional):<br>
        Alternative name of the children object.<br> 
        Instead of declaring a different property for each type, declare it as `nodes`. You will have also to specify the type by declaring the .type property.<br>
        Use either this property or a type specific property (seq,sel,inv etc)


## Scopes
Scope variables is the way to have local variables in nodes during a tree run:
- A scope is a special object that can be declared inside any node, in order to declare some local variables for this node
- For each property:
    - The property **key** is the name of the local variable
    - The property **value** is the value of the local variable
    - You **could** set the value to another object that contains its own variables and so on
    - In fact, you **should** set the value to an object, if you want to change properties of this variable from an inner node. This is the very same reason applied -for example- in Angular.js nested scopes (the famous dot rule).
    - If you want just to read (and not modify) the value of a parent scope, then it is not necessary to use the dot rule. However, it is a good practice to always use this rule.
- The scope is visible from all the inner actions inside this node or its children nodes
- The scope of an inner node contains all the properties of itself and its parent nodes
- If the scope of an inner node and the scope of a parent node share a property with the same name, an error is generated during the tree creation (scope collision). This is for avoiding bugs in large projects
- It is best to create all scope variables during creation and not during execution (inside an action), if there is a chance of scope collision. 

## Parallel execution
- **Discussion**

If we want to build a really useful application, then implementing  parallel execution of nodes is a must. We can always run them as separate trees that share data through actions, but a parallel container is more elegant.

So, we introduce the parallel container. Its execution starts differently, because its child nodes try to run all together at once. It also stops differently, because there are much more options to control when to stop and return.

As a bonus, we don't mess with ticks and concurrent execution. To run a parallel container is easy, just fire all child nodes and wait..

However, care must be taken when finishing a parallel container. Suppose that a child node finishes and the result of the parallel container is ready. But the other child nodes are still running. What should we do with them? 

- (1) Should we interrupt and terminate them and THEN return the container result?
- (2) Should we wait for them to finish and THEN return the container result?
- (3) Or should we let them finish, but first return IMMEDIATELY the container result?

The first option is clearly no good. We certainly don't want to execute partly an action, because this could introduce countless errors.

The second option may be needed sometimes, but has some drawbacks. Suppose that a parallel container contains two actions, a real job action and a timeout watchdog action. If the real job finishes, should we wait for the time out action to finish too? Surely not.

For this reason, the third option is selected as the default behavior. This is what we usually want: Return immediately when the result is determined, but let the actions finish in their time. If we call again too soon the same parallel container, it will silently wait until all of its internal actions finish first, then start the new execution.

Sometimes, we may need to override the default behaviour and use the second option, which is to wait until ALL (or at least SOME critical) running actions terminate and THEN return the container result.

There are two mechanisms to override the default behavior and make the parallel container wait for its child nodes: By child node or by parallel container.

By child node means that one or more specific child nodes must terminate before the container returns. For this reason, set the option `waitForMe` to true inside each one of those specific child nodes we should wait for.

By parallel container means that all (and not just some) child nodes must terminate before the container returns. For this reason, set the container option `waitForAll` to true. This is equivalent to setting `waitForMe` for each child node.

When an action terminates and is deeply inside a branch of a parallel container that is ready to return, then no more nodes are executed in this branch. Instead, execution of the branch stops here and all of the running nodes terminate, while their results are thrown away.

- **Example**

To clarify what we mean by terminating an action inside a branch: Suppose that a parallel container A contains two nodes: An action named B and a sequence named C. Sequence C contains itself 5 actions, named c1,c2,c3,c4 and c5 respectively.

Now, suppose that A.maxSuccess was set to 1 and action B terminates first with Success, so we must return with Success from A too. At this moment, the action c3 is in the middle of its execution. 
    - Here's what will happen next, if the default behavior applies:
        - Action A returns with the Success result from B. If now we call again A too soon, it will wait because one of its child actions (c3) is still running (marking A as busy).
        - Action c3 finishes, with success or with failure. Sequence C will not continue to action c4 (if c3 finished with a success) but returns immediately.
        - Action A throws away the result that C just returned, because it has already returned with a result. No more child nodes of A will be executed
        - If we call now A again, it will start without a delay
    - But here's what will happen next, if A.waitForAll==true instead:
        - Action c3 finishes with success or with failure. Sequence C will not continue to c4 (if c3 finished with a success) but returns
        - Action A throws away the result that C just returned
        - Action A returns with the success result from B. No internal actions are running, so if we call again A immediately, it will start without a delay

When we use a parallel container, we should be aware that the behavior of the container nodes inside the parallel has changed: A sequence may stop processing its nodes for a reason outside of this sequence.

## Todo
- Add more checks and errors
- Accept functions as node properties
- Implement more types and properties (random, repeat, forEach) and properties (max, until, while)
- Add links to reuse tree parts in more than one places
- Add user-defined aliases (for example, 'if' instead of 'sel')
- Declare types of input arguments and output values, check type matching, consider optionals
- Declare the actionType once for each action and not in each node, where action is called
- Add debug features
- Write tests
- Develop a companion graphic tool for editing and debugging the trees (or leave it to another contributor?)
