# behavior-promise
Organize complex code execution in Javascript using [behavior trees](http://en.wikipedia.org/wiki/Behavior_tree).

For suggesstions, feel free to write to the author.

- [Features](#features)
- [Installation](#installation)
- [Definitions](#definitions)
- [Examples](#examples)
- [API](#api)
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

#### Module
> ##### .create(config)
> Initializes a tree and prepares it for execution.
> 
> config is a **Config** object described below.
> 
> Returns a **Tree** object described below.
> 
> If an error occurred during creation, then tree.error is set to a short string describing the error.

#### Tree
> ##### .run(input) 
> Executes the tree
>
> `input` is an optional single argument to pass to the tree
>
> Returns a **Promise**:
> - If tree execution ends with a success, the promise is fulfilled returning the success value
> - If tree execution ends with a failure, the promise is rejected returning the failure value
>
> ##### .error
> Property to indicate that an error occured during tree creation:
> - If an error occured during tree creation, set to a short string describing the error
> - If no error occured, set to `null`

#### Config
> Object to define a tree cration. May contain the following properties:
> - **.root** (Required)
> 	The root node of the tree, containing all nodes. May be an object or a string.
> 	- If object, then it is a **Node** object described below
> 	- If string, then it is parsed according to `rootFormat`
>
> - **.rootFormat** (Optional)
> 	Determine the way to parse the given root, in order to build the tree.
>
> 	Default value: If root is an object, default rootFormat is `'object'`. If root is a string, default rootFormat is `'json'`
>
>   rootFormat may be one of the following strings:
>     - **'object'**
> 		Root (and its children) is already a tree object. Do not parse it
> 	- **'json'**
> 	    Root is a JSON string. Parse it to get the tree object
> 	- **'jsonfile'**
> 		Root is the filename of a JSON text file. Load and parse it to get the tree object
> 	- **'yaml'**
> 		Root is a YAML text string. Parse it to get the tree object
> 	- **'yamlfile'**
> 		Root is the filename of a YAML text file. Load and parse it to get the tree object
> - **.actions** (Required) 
>	An object containing all the available actions as properties.
>	
>   For each property:
> 	- Property key is the action path key (see run)
> 	- Property value is either a function (the action) or an object containing more properties

#### Node
> Object with the following properties (all optional):
> - **.type**
>   A string indicating the node type.
>
>   May be one of: 'action','seq','sel','invert','success','failure'.
>
>   If no type is given but node has also a type specific property (`action`, `seq`, `sel`, `inver`, `success`, `failure`), then node type is concluded from the property key.
>
>   If no type is given and there is no type specific property but there is a `nodes` property, then node type is `seq`.
> - **.actionType**
>   If node is an action, define here the action type. 
>   
>   If node is not an action, define here the default action type of the children nodes.
>   
>   May be one of : `promise`,`callback`,`boolean`,`plain` (see action for definitions).
>   
>   Default is going up parent actionType. If `actionType` is not found and no children specific property is given, then actionType='plain'.
> - **.scope**
>   A scope object, containing a set of variables as properties. Each property X is available as this.X inside the  actions of this node and its child nodes.
>   
>   An action, through this, can access its scope and all its parent nodes scopes as one scope.
>   
>   In order to avoid bugs, it is considered an error to have a property with the same name in a node scope and in any of its children nodes scope.
> - **.title**
>   A string describing this node
>   
>   Useful for editing/viewing/debugging the tree
>   
> - **.action**
>   Action to execute.
>   
>   May be a word string, an object path string or a function:
>   - If word string (AAAA), execute the function from tree.config.actions[AAAA]
>   - If object path string (AAA.BBB.CCC), execute the function from tree.config.actions[AAA][BBB][CCC]
>   - If function, execute directly this function.
>   
>   The function will be invoked according to the rules of the specified actionType:
>   - **promise**: 
>     Invoke a promise function
>   
>     If rejected or exception occurs, return failure. If fulfilled, return success
>   - **callback**: 
>     Invoke a function f(input,cb)
>   
>     input is an optional argument
>     
>     cb is a callback function of type cb(err,result)
>     
>     When done, cb is called. If err is not null or an exception occurs, return failure. If err is null and no exception occurs, return success
>   - **boolean**: 
>     Invoke a function f(input)
>   
>     input is an optional argument
>     
>     When done, function must return a true/false result. If result = false or exception occurs, return failure. If result = true, return success
>   - **plain**: 
>     Invoke a plain function f(input)
>   
>     input is an optional argument
>     
>     When done, function must just return. If exception occurs, return failure. If no exception occurs, return success
> - **.seq**
> 
>   Sequence. An array with child nodes to execute in sequence.
>   
>   When a failure occurs in a child node, stop the sequence and return a failure.
>   
>   If all nodes succeeded, return a success
>   
> - **.sel**
> 
>   Priority selector. An array with nodes to select one.
>   
>   Try to execute all child nodes in sequence, from first to last.
>   
>   When a child node succeeds, stop the sequence and return immediately success.
>   
>   When a child node fails, try the next node in sequence.
>   
>   If all nodes failed, return a failure.
>   
> - **.invert**
>   Invert decorator. Execute the child node, reverse its result (success<->failure) and return it.
> - **.success**
>   Success Decorator. Execute the child node and return success, no matter what the child node returned.
> - **.failure**
>   Failure Decorator. Execute the child node and return failure, no matter what the child node returned
> - **.nodes**
>   Alternative name of the children object. Instead of declaring a different property for each type, declare it as `nodes`. You will have also to specify the type by declaring the .type property.
>   
>   Use either this or a type specific property (seq,sel,inv etc)

## Todo
- Add more checks and errors
- Accept functions as node properties
- Implement more types and properties (random, parallel, repeat, repeatUntil, forEach, max)
- Complete the scope functionality (currently descendants do not work)
- Add links to reuse tree parts in more than one places
- Add user-defined aliases (for example, 'if' instead of 'sel')
- Declare types of input arguments and output values, check type matching, consider optionals
- Declare the actionType once for each action and not in each node, where action is called
- Add debug features
- Develop a companion graphic tool for editing and debugging the trees
