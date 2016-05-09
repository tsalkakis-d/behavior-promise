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

<table>
    <tr><td colspan=3><h3>Module object</h3></td></tr>
    <tr><td colspan=3><h4>.create(config)</h4></td></tr>
    <tr>
        <td></td>
        <th>Description</th>
        <td><ul>
            <li>Initializes a tree and prepares it for execution</li>
        </ul> </td>
    </tr>
    <tr>
        <td></td>
        <th>Input</th>
        <td>
            <ul>
                <li><b>config</b> (Required)<br>
                    Defines the tree creation. Object with the following properties:
                    <ul>
                        <li>
                            <b>.root</b> (Required)<br>
                            The root node of the tree, containing all nodes. May be an object or a string:
                            <ul>
                                <li>If root is an <b>object</b>, then it is assumed to be a **Node** object described below</li>
                                <li>If root is a <b>string</b>, then it is parsed according to `rootFormat`</li>
                            </ul>
                        </li>
                        <li>
                            <b>.rootFormat</b> (Optional)<br>
                            Determine the way to parse the given root, in order to build the tree.<br>
                            Default value:
                            <ul>
                                <li>If root is an object, default rootFormat is `'object'`.</li>
                                <li>If root is a string, default rootFormat is `'json'`</li>
                            </ul>
                            rootFormat may be one of the following strings:
                            <ul>
                                <li><b>'object'</b>:<br>Root (and its children) is already a tree object. Do not parse it</li>
                                <li><b>'json'</b>:<br>Root is a JSON string. Parse it to get the tree object</li>
                                <li><b>'jsonfile'</b>:<br>Root is the filename of a JSON text file. Load and parse it to get the tree object</li>
                                <li><b>'yaml'</b>:<br>Root is a YAML text string. Parse it to get the tree object</li>
                                <li><b>'yamlfile'</b>:<br>Root is the filename of a YAML text file. Load and parse it to get the tree object</li>
                            </ul>
                        </li>
                        <li>
                            <b>.actions</b> (Required)<br>
                            An object containing all the available actions as properties.<br>
                            For each property:
                            <ul>
                                <li>Property key is the action path key (see run)</li>
                                <li>Property value is either a function (the action) or an object containing more properties</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        </td>
    </tr>
    <tr>
        <td></td>
        <th>Output</th>
        <td><ul>
            <li><b>On success:</b><br>
                Returns a <b>Tree</b> object (described below)
            </li>
            <li><b>On error:</b><br>
                Returns a <b>Tree</b> object, where tree.error is set to a short string describing the error
            </li>
        </ul></td>
    </tr>
</table>

<table>
    <tr><td colspan=3><h3>Tree object</h3></td></tr>
    <tr><td colspan=3><h4>.run(input)</h4></td></tr>
    <tr>
        <td></td>
        <th>Description</th>
        <td><ul>
            <li>Runs (executes) the tree, starting from the root node</li>
        </ul></td>
    </tr>
    <tr>
        <td></td>
        <th>Input</th>
        <td><ul>
            <li><b>input</b>
                An optional single argument to pass to the root node
            </li>
        </ul></td>
    </tr>
    <tr>
        <td></td>
        <th>Output</th>
        <td>
            Returns a <b>promise</b> that will execute the whole tree and:
            <ul>
                <li>On success:<br>
                The promise will be fulfilled and will return the output value of the last node executed</li>
                <li>On Failure:<br>
                The promise will be rejected and will return as an error the output value of the last node executed</li>
            </ul>
        </td>
    </tr>
    <tr><td colspan=3><h4>.error</h4></td></tr>
    <tr>
        <td></td>
        <th>Description</th>
        <td>
            Property to indicate that an error occured during tree creation:
            <ul>
                <li>If an error occured during tree creation, property is set to a short string describing the error</li>
                <li>If no error occured, property is set to null</li>
            </ul>
        </td>
    </tr>
</table>

<table>
    <tr><td colspan=3><h3>Node object</h3></td></tr>
    <tr>
        <td></td>
        <th>Description</th>
        <td>
            Object with the following properties (all optional):
            <ul>
                <li>
                    <b>.type</b> (Optional):<br>
                    A string indicating the node type.<br>
                    May be one of: 'action','seq','sel','invert','success','failure'.<br>
                    If no type is given but node has also a type specific property (`action`, `seq`, `sel`, `inver`, `success`, `failure`), then node type is concluded from the property key.<br>
                    If no type is given and there is no type specific property but there is a `nodes` property, then node type is `seq`.<br>
                </li>
                <li>
                    <b>.scope</b> (Optional):<br>
                    A scope object, containing a set of variables as properties. Each property X is available as this.X inside the  actions of this node and its child nodes.<br>
                    An action, through this, can access its scope and all its parent nodes scopes as one scope.<br>
                    In order to avoid bugs, it is considered an error to have a property with the same name in a node scope and in any of its children nodes scope.<br>
                </li>
                <li>
                    <b>.title</b> (Optional):<br>
                    A string describing this node<br>
                    Useful for editing/viewing/debugging the tree<br>
                </li>
                <li>
                    <b>.actionType</b> (Optional):<br>
                    If node is an action, define here the action type.<br>
                    If node is not an action, define here the default action type of the children nodes.<br>
                    May be one of : `promise`,`callback`,`boolean`,`plain` (see action for definitions).<br>
                    Default is going up parent actionType. If `actionType` is not found and no children specific property is given, then actionType='plain'.<br>
                </li>
                <li>
                    <b>.action</b> (Optional):<br>
                    Action to execute.<br>
                    May be a word string, an object path string or a function:
                    <ul>
                       <li>If word string (AAAA), execute the function from tree.config.actions[AAAA]</li>
                       <li>If object path string (AAA.BBB.CCC), execute the function from tree.config.actions[AAA][BBB][CCC]</li>
                       <li>If function, execute directly this function</li>
                   </ul>
                    The function will be invoked according to the rules of the specified actionType:
                    <ul>
                        <li>If actionType is <b>promise</b>:<br>
                            Invoke a promise function<br>
                            If rejected or exception occurs, return failure.<br>
                            If fulfilled, return success
                        </li>
                        <li>If actionType is <b>callback</b>:<br>
                            Invoke a function f(input,cb)
                            input is an optional argument
                            cb is a callback function of type cb(err,result) to call when done<br>
                            Success is returned when err is null and no exception occurs<br> 
                            Failure is returned when err is not null or an exception occurs
                        </li>
                        <li>If actionType is <b>boolean</b>:<br>
                            Invoke a function f(input)<br>
                            input is an optional argument<br>
                            When done, function must return a true/false result.<br> 
                            If result = false or exception occurs, return failure.<br> 
                            If result = true, return success
                        </li>
                        <li>If actionType is <b>plain</b>:<br>
                            Invoke a plain function f(input)<br>
                            input is an optional argument<br>
                            When done, function must just return.<br> 
                            Success is returned when no exception occurs<br>
                            Failure is returned when an exception occurs
                        </li>
                    </ul>
                </li>
                <li>
                    <b>.seq</b> (Optional):<br>
                    Sequence. An array with child nodes to execute in sequence.<br>
                    When a failure occurs in a child node, stop the sequence and return a failure.<br>
                    If all nodes succeeded, return a success
                </li>
                <li>
                    <b>.sel</b> (Optional):<br>
                    Priority selector. An array with nodes to select one.<br>
                    Try to execute all child nodes in sequence, from first to last.<br>
                    When a child node succeeds, stop the sequence and return immediately success.<br>
                    When a child node fails, try the next node in sequence.<br>
                    If all nodes failed, return a failure.<br>
                </li>
                <li>
                    <b>.invert</b> (Optional):<br>
                    Invert decorator. Execute the child node, reverse its result (success<->failure) and return it.
                </li>
                <li>
                    <b>.success</b> (Optional):<br>
                    Success Decorator. Execute the child node and return success, no matter what the child node returned.
                </li>
                <li>
                    <b>.failure</b> (Optional):<br>
                    Failure Decorator. Execute the child node and return failure, no matter what the child node returned
                </li>
                <li>
                    <b>.nodes</b> (Optional):<br>
                    Alternative name of the children object.<br> 
                    Instead of declaring a different property for each type, declare it as `nodes`. You will have also to specify the type by declaring the .type property.<br>
                    Use either this property or a type specific property (seq,sel,inv etc)
                </li>
            </ul>
        </td>
    </tr>
</table>

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
