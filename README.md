# behavior-promise
Organize complex code execution in Javascript using [behavior trees](http://en.wikipedia.org/wiki/Behavior_tree).

For suggesstions, feel free to write to the author.

- [Features](#features)
- [Installation](#installation)
- [Definitions](#definitions)
- [Examples](#examples)
- [API](#api)
- [Scopes](#scopes)
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
    -  Can have children nodes and run them in a specific way (depends on node type))
	-  May be in one of the **states**: Running, finished with Success, finished with Failure
	-  Accepts an optional **input argument**
	-  Returns an optional **output value**
	-  When run, its output value becomes the input argument of the next node to run
	-  Can have a **scope** containing private variables, available to the node and its descentants
	-  May be of type:
		- **Action**: Node is actually an external or internal Javascript function that:
			-  Checks for a condition or performs a (probably time consuming) operation.
			-  Returns a Success or a Failure result
			-  May be called and run as a:
				- **Promise** object, which succeeds when it is fulfilled and fails when it is rejected
				- **Callback** function(error,result), which succeeds when it does not return an error and fails otherwise
				- **Boolean** function, which succeeds when it returns true and fails otherwise
				- **Plain** function, which succeeds when it finishes without an exception and fails otherwise
		- **Container**: Node contains one or more child nodes. More specific, a container may be:
			- A **Sequence**: node executes sequentially its child nodes until one of them fails
			- A **Selector**: node executes sequentially its child nodes until one of them succeeds
		- **Decorator**: Node that contains a single child node and shapes its result. More specific, a decorator may be:
			- An **Inverter** node executes the child node and then reverses the success/failure result
			- A **Success** node executes the child node then returns always Success
			- A **Failure** node executes the child node and then returns always Failure


## Examples

A simple example:

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

An example of a game AI attempting to enter a room:

```js
var behavior = require('behavior-promise');
var tree = behavior.create({
    root: {
    	sel: [       // Try various ways to enter the door
            {seq:['door.isOpen','room.moveInto']},	    // If door is already open, enter the room
            {seq:[    // If door is closed, attempt to enter the room by opening, unlocking or kicking the door
                'door.moveTo',		// Move to the door
                {sel:[	// Unlock or kick the door, whatever suceeds
                    {seq:['door.isLocked','door.unlock']},	// Attempt to unlock
                    {seq:['door.kick','door.isOpen']}		// Attempt to kick
                ]},
                'room.moveInto'			// Move into the room if one of the above succeeded
            ]}
        ]
    },
    actions: {
        door: {
            isOpen: function(){/*...*/},
            isLocked: function(){/*...*/},
            moveTo: function(){/*...*/},
            kick: function(){/*...*/},
            unlock: function(){/*...*/},
        },
        room: {
        	moveInto: function(){/*...*/},
        },
    }
});

// Run the tree
if (tree.error)
    console.log(tree.error);
else 
    tree.run().then(
    	function(){console.log('SUCCESS')},
        function(){console.log('FAILURE')}
    );
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
            The promise will be rejected and will return as an error the output value of the last node executed
#### .error
- ##### Description
    - Property to indicate that an error occured during tree creation:
        - If an error occured during tree creation, property is set to a short string describing the error
        - If no error occured, property is set to null

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
        Variables are accessible from actions of this node and its child nodes.<br>
        If scope has a property with name 'var', then an action cann access the property using this.var<br>
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

## Todo
- Add more checks and errors
- Accept functions as node properties
- Implement more types and properties (random, parallel, repeat, repeatUntil, forEach, max)
- Add links to reuse tree parts in more than one places
- Add user-defined aliases (for example, 'if' instead of 'sel')
- Declare types of input arguments and output values, check type matching, consider optionals
- Declare the actionType once for each action and not in each node, where action is called
- Add debug features
- Develop a companion graphic tool for editing and debugging the trees (or leave it to another contributor?)
