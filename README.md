# behavior-promise
Organize complex code execution in Javascript using [behavior trees](http://en.wikipedia.org/wiki/Behavior_tree).

- [Features](#features)
- [Installation](#installation)
- [Definitions](#definitions)
- [Examples](#examples)
- [API](#api)
- [Todo](#todo)

## Features
- Mix promises, callbacks and plain functions without conversion
- Dynamic order of actions execution
- Local variables in nodes (instead of blackboard implementation)
- Scales well in complex applications without losing control
- Adapted to use functions from existing objects with almost zero cost
- Trees may be loaded from objects, JSON files or YAML files

## Installation 
In Node.js:
```bash
$ npm install --save behavior-promise
```
## Definitions
- A behavior **tree** runs conditionally a sequence of actions
- A tree **node** may be of type: action, sequence, selector, inverter, success, failure
- A node may have a **scope** with private variables, available to all its descentants
- A node may be in one of the **states**: Running, finished with Success, finished with Failure
- A node may be either an action or a container that contains child nodes
- An **action** may be a promise, a callback, a boolean function or a plain function
- A **promise** succeeds when it is fulfilled and fails when it is rejected
- A **callback** function(err,res) succeeds when it returns res and fails when it returns err
- A **boolean** function succeeds when it returns true and fails when it returns false
- A **plain** function succeeds when it finishes without an exception and fails otherwise
- An action node accepts an **input argument** and returns an **output value**
- A **sequence** node executes its childs nodes until one fails
- A **selector** node executes its child nodes until one succeeds
- An **inverter** node executes its only child and then it reverses the success/failure outcome
- A **success** node executes its only child and then it returns always Success
- A **failure** node executes its only child and then it returns always Failure
- When a node is executed, its output becomes the input of the next node to execute


## Examples

A simple example:

```js
var behavior = require('behavior-promise');

// Prepare the tree
var tree = behavior.create({
    root: {
    	seq: [
	        {action:'action1'},
    	    {action:'action2'}
    	    {action:'action3'}
        ]
    },
    actions: {
		action1: function() {return 1},
        action2: function(x) {console.log(x)}
        action3: function() {console.log('Done')}
    }
});
tree.run().done();
```

An example of a game AI attempting to enter a room:

```js
var behavior = require('behavior-promise');
var tree = behavior.create({
    root: {
    	sel: [
	        {seq:['door.isOpen','moveIntoRoom']},
    	    {seq:[
            	'door.moveTo',
                {sel:[
                	{seq:['door.isLocked','door.unlock']},
                    {seq:['door.kick','door.isOpen']}
                ]},
                'moveIntoRoom'
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
####Module
> #####.create(config)
Initializes a tree and prepares it for execution.
Returns a **Tree** object described below.
If an error occurred during creation, then tree.error is set to a short string describing the error.
config is a **Config** object described below.

####Tree
> #####.run(input) 
Executes the tree
input is an optional single argument to pass to the tree
run() returns a **Promise**. 
If tree execution ends with a success, the promise is fulfilled returning the success value
If tree execution ends with a failure, the promise is rejected returning the failure value
####.error
If an error occured during tree creation, then this property is set to a short string describing the error
If no error occured, then this property is set to `null`

####Config
> Object with the following properties:
- **root** (Required)
	The root node of the tree, containing all nodes. May be an object or a string
    Root parsing is performed according to the option rootFormat
    The roor node is a **Node** object described below
- **rootFormat** (Optional)
	Determine the way to parse the given root, in order to build the tree.
	Default value: If root is an object, default rootFormat is `'object'`. If root is a string, default rootFormat is `'json'`
    rootFormat may be one of the following strings:
    - **'object'**
		Root is a tree object already. Do not parse it
	- **'json'**
	    Root is a JSON string. Parse it to get the tree object
	- **'jsonfile'**
		Root is the filename of a JSON text file. Load and parse it to get the tree object
	- **'yaml'**
		Root is a YAML text string. Parse it to get the tree object
	- **'yamlfile'**
		Root is the filename of a YAML text file. Load and parse it to get the tree object
- **actions** (Required) 
	An object containing all the available actions as properties
    For each property:
	- Property key is the action path key (see run)
	- Property value is either a function (the action) or an object containing more properties

####Node
> Object with the following properties (all optional):
- **type**
A string indicating the node type.
May be one of: 'action','seq','sel','invert','success','failure'
If no type is given but node has also a type specific property (`action`,`seq`,`sel`,`inver`,`success`,`failure`), then node type is concluced from the property key.
If no type is given and there is no type specific property but there is a `nodes` property, then node type is `'seq'`.
- **actionType**
- **scope**
- **title**
- **action**
- **seq**
- **sel**
- **invert**
- **success**
- **failure**
- **nodes**

## Todo
- Add more checks and errors
- Accept functions as node properties
- Implement more types and properties (random, parallel, repeat, repeatUntil, max)
- Complete the incomplete scope functionality
