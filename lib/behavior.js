// BEHAVIOR-PROMISE

var yaml = require('js-yaml');
var fs = require('fs');
 
// // // Create a new behavior tree and return its instance
// Input:
//      config:             (Required) The configuration object to create for the tree. May contain the following options:
//          root:           (Required) The root node of the tree, containing all nodes. May be an object or a string
//                              Root parsing is performed according to the option rootFormat
//          rootFormat:     (Optional) Determine the way to parse the given root, in order to build the tree.
//                              Default value: If root is a string, default rootFormat is 'json'. If root is an object, default rootFormat is 'object'
//                              rootFormat may be one of the following:
//                                  'object':   Root is a tree object already. Do not parse it
//                                  'json':     Root is a JSON string. Parse it to get the tree object
//                                  'jsonfile': Root is the filename of a JSON text file. Load and parse it to get the tree object
//                                  'yaml':     Root is a YAML text string. Parse it to get the tree object
//                                  'yamlfile': Root is the filename of a YAML text file. Load and parse it to get the tree object
//          actions:        (Required) An object containing all the available actions as properties
//                              Property key is the action path key (see run)
//                              Property value is either a function (the action) or an object containing more properties
//          
exports.create = function(config) {
    var tree = new Tree(config);
    return tree;
}

// Available node types
var nodeTypes = {
    action: {leaf: true}, // An action
    seq: {leaf: false}, // Sequence: Execute actions until fail
    sel: {leaf: false}, // Selector: Execute actions until succeed
    par: {leaf: false}, // Parallel: Execute actions until max fails of max succeeds
    invert: {leaf: false, decorator: true}, // Invertor: Execute action, then invert result
    success: {leaf: false, decorator: true}, // Success: Execute action, then always report success
    failure: {leaf: false, decorator: true}, // Fail: Execute action, then always report failure
};

// Available action types
var actionTypes = {
    promise: {},
    callback: {},
    boolean: {},
    plain: {},
};

// Tree class
function Tree(treeConfig) {

        var _this = this;
        this.root = null;
        this.config = null;
        this.actions = null;
        this.error = null;
        
        // Debugging
        this.debug = {
            enable: false,  // Debug status. true = enable writing in console.log
            stack: [],      // When a .debug property is found in a node, push here previous debug status
            prefix: '                ', // Write this string before each debug message
            tabWidth: 4, // Increase prefix by this size on each node entry
            open: function(node) {
                // Push new debug state into debugStack
                if (node.hasOwnProperty('debug')) {
                    _this.debug.stack.push(_this.debug.enable);
                    _this.debug.enable = node.debug;
                }

                if (_this.debug.enable) {
                    ds = _this.debug.prefix;
                    ds += 'NODE(type='+node.type;
                    if (node.title)
                        ds+=', title='+node.title;
                    if (node.type=='action') {
                        ds +=', actionType='+node.actionType;
                    }
                    ds += ')';
                    console.log(ds);
                    _this.debug.prefix += ' '.repeat(_this.debug.tabWidth);
                }
                
            },
            close: function(node) {
                // Pop debug state from stack    
                if (_this.debug.enable) {
                    _this.debug.prefix = _this.debug.prefix.slice(0,-_this.debug.tabWidth);
                }
                if (node.hasOwnProperty('debug')) {
                    _this.debug.enable = _this.debug.stack.pop();
                }
            },
        };
        
        // Prepare for execution recursively a node during tree initialization
        this.prepare = function(node, parent){

            // Ensure a valid .type exists
            // If type is not given, search node properties and return the first valid type property. If no such property was found, set type to 'seq'.
            var nodeType = node.type || null;
            if (!nodeType) { // If .type is not given 
                // Search for a type specific property
                Object.keys(nodeTypes).forEach(function(aType){ // For each type specific property
                    if (node.hasOwnProperty(aType)) { // If property exists
                        // There can be only one! (type property)
                        if (nodeType===null)
                            nodeType = aType;
                        // TODO: else error
                    }
                });
                if (nodeType) // If type property found
                    node.type = nodeType;
            } else { // If .type is given
                // Type must be a valid one
                if (!nodeTypes[nodeType])
                    nodeType = null;
            }
            if (!nodeType) { // If could not determine the node type
                // TODO: Report error
                return;
            }

            // Ensure a valid .actionType exists (specific type, parent type, default type)
            if (!node.hasOwnProperty('actionType')) { // If actionType is not given
                node.actionType = parent.actionType || 'plain';
            }
            if (!actionTypes[node.actionType]) {
                _this.error = 'Invalid action type '+node.actionType;
                return;
            }

            // If node is a leaf
            if (nodeTypes[nodeType].leaf) {

                // Get the function
                var typeofAction = typeof node.action
                switch (typeofAction)  {
                    case 'string':
                        // From action path (AAA, AAA.BB, AAA.BB.C etc) -> Locate function (actions[AAA], actions[AAA][BB], actions[AAA][BB][C] etc)
                        node.fn = node.action.split('.').reduce(function (prev,curr){return prev[curr]}, _this.actions);
                        break;
                    case 'function': 
                        node.fn = node.action;
                        break;
                    default:
                        _this.error = 'Invalid typeof action: '+typeofAction;
                        break;
                }

            } else { // If node is not a leaf 

                // Ensure .nodes exists
                // Create a .nodes property if it does not exist
                if (!node.hasOwnProperty('nodes')) { // If there is no nodes property, create it
                    if (node.hasOwnProperty(nodeType)) // If there is a type property
                        node.nodes = node[nodeType];
                    // TODO: Else error
                }

                // Prepare recursively all children of this node
                for (var i in node.nodes) {
                    if (typeof node.nodes[i] === 'string')
                        node.nodes[i] = {action: node.nodes[i]+''};
                    _this.prepare(node.nodes[i], node);
                }

            }

        };



        // Run a node of the tree
        // runNode(node, parentScope) returns a promise to run this node
        // Node is an object or a string:
        //   If node is a string SSSSS, then it is the equivalent to object {action:SSSSS}
        //   If node is an object, then it may have the following properties:
        //      type:               A string indicating the node type. 
        //                              May be one of: 'action','seq','sel','invert','success','failure'
        //                              Node must also have a property with a name similar to this value. For example, if node.type='seq', node should also have a node.seq property.
        //                              If type is not given, search node properties and return the first valid type property. If no such property was found, set type to 'seq'.
        //      actionType:         If node is an action, define here the action type. If node is not an action, define here the default action type of the children nodes.
        //                              May be one of : 'promise','callback','boolean','plain' (see action for definitions)
        //                              Default is going up parent actionType. If not found and no children specific property is given, actionType='plain'.
        //      scope:              A scope object, containing a set of variables as properties. Each property X is available as this.X inside the  actions of this node and its child nodes
        //                          An action, through this, can access its scope and all its parent nodes scopes as one scope.
        //                          In order to avoid bugs, it is considered an error to have a property with the same name in a node scope and in any of its children nodes scope
        //      title:              A string describing this node
        //                          Useful for editing the tree    
        //                          
        //      action:             Action to execute. 
        //                              May be a word string, an object path string or a function:
        //                                  - If word string (AAAA), execute the function from tree.config.actions[AAAA]
        //                                  - If object path string (AAA.BBB.CCC), execute the function from tree.config.actions[AAA][BBB][CCC]
        //                                  - If function, execute directly this function
        //                              The function will be invoked according to the rules of the specified actionType:
        //                                  - promise: Invoke a promise function
        //                                      If rejected or exception occurs, return failure. If fulfilled, return success
        //                                  - callback: Invoke a function of type f(input,cb)
        //                                      input is an optional argument
        //                                      cb is a callback function of type cb(err,result)
        //                                      When done, cb is called. If err!==null or exception occurs, return failure. If err === null, return success
        //                                  - boolean: Invoke a function of type f(input)
        //                                      input is an optional argument
        //                                      When done, function must return a true/false result. If result = false or exception occurs, return failure. If result = true, return success
        //                                  - plain: Invoke a plain function(input) 
        //                                      input is an optional argument
        //                                      When done, function must just return. If exception occurs, return failure. If no exception occurs, return success
        //      seq:                Sequence. An array with child nodes to execute in sequence. 
        //                              When a failure occurs in a child node, stop the sequence and return a failure. 
        //                              If all nodes succeeded, return a success
        //      sel:                Priority selector. An array with nodes to select one
        //                              Try to execute all child nodes in sequence, from first to last
        //                              When a child node succeeds, stop the sequence and return immediately success
        //                              When a child node fails, try the next node in sequence
        //                              If all nodes failed, return a failure
        //      par:                Parallel execution. An array with nodes to run in parallel
        //                          The node will end when maxSuccess is triggered, when maxFailure is triggered or when all child nodes end
        //      maxSuccess:         When set inside a parallel container, defines how many of its child nodes must end with success in order trigger a container success.
        //                          May be:
        //                              A number (1,2,3,...), indicating how many child nodes must end with a success
        //                              true, indicating that all child nodes must end with a success
        //                              false, indicating that container should never check for a success
        //      maxFail:            When set inside a parallel container, defines how many of its child nodes must end with failure in order to trigger a container failure.
        //                          May be:
        //                              A number (1,2,3,...), indicating how many child nodes must end with a failure
        //                              true, indicating that all child nodes must end with a failure
        //                              false, indicating that container should never check for a failure
        //      waitForMe           If set to true in a parallel child, then parallel will wait for this node to end before returning
        //      waitForAll          If set to true in a parallel container, then parallel will wait for all of its child nodes to end before returning
        //      invert:             Invert decorator. Execute the child node, reverse its result (success<->failure) and return it
        //      success:            Success Decorator. Execute the child node and return success, no matter what the child node returned
        //      failure:            Failure Decorator. Execute the child node and return failure, no matter what the child node returned
        //      debug:              TODO: if set and true, print debug information in console while executing    
        //      nodes:              Alternative children object. Use this to name the children property with a fixed name, instead of having a different property for each style
        //                              Use either this or a style specific property (seq,sel,inv)
        //                              
        var runNode = function(node, parentScope) {

            var result; // Result to return
            var ds;     // Debug string
            
            _this.debug.open(node);

            // Get this scope
            var scope = node.scope || {};
            
            // Mix with parent scope
            for (var i in parentScope) {
                if (!scope.hasOwnProperty(i))
                    scope[i] = parentScope[i];
            }
            
            switch (node.type) {

                case 'action':

                    switch (node.actionType) {

                        case 'promise':
                            return function(input) {
                                if (_this.debug.enable) 
                                    console.log(_this.debug.prefix+'Input='+input);
                                return node.fn.call(scope,input);
                            }
                            break;

                        case 'callback':
                            return function(input) {
                                if (_this.debug.enable) 
                                    console.log(_this.debug.prefix+'Input='+input);
                                return new Promise(function(resolve, reject){
                                    try {
                                        //..
                                        node.fn.call(scope, input, function(err,res){
                                            if (err)
                                                reject(err);
                                            else
                                                resolve(res);
                                        });
                                    } catch (ex) {
                                        console.log(ex);
                                        reject(ex);
                                    }
                                });
                            }
                            break;

                        case 'boolean':
                            return function(input) {
                                if (_this.debug.enable) 
                                    console.log(_this.debug.prefix+'Input='+input);
                                return new Promise(function(resolve, reject){
                                    try {
                                        result = node.fn.call(scope, input);
                                        if (result)
                                            resolve(result);
                                        else
                                            reject(result);
                                    } catch (ex) {
                                        reject(ex);
                                    }
                                });
                            }
                            
                        case 'plain':
                            return function(input) {
                                if (_this.debug.enable) 
                                    console.log(_this.debug.prefix+'Input='+input);
                                return new Promise(function(resolve, reject){
                                    try {
                                        result = node.fn.call(scope, input);
                                        resolve(result);
                                    } catch (ex) {
                                        reject(ex);
                                    }
                                });
                            }
                            break;
                    }


                    break;

                case 'seq':
                    // Execute all childs until failure. 
                    // Return first failure or last success
                    // Each child gets its input from the previous child success
                    return function(input) {
                        var chain = Promise.resolve(input);
                        node.nodes.forEach(function(child){
                            chain = chain.then(function(inp){
                                return runNode(child,scope)(inp);
                            });
                        });
                        return chain;
                    }
                    break;

                case 'sel':
                    // Execute all childs until success. 
                    // Return first success or last failure
                    // Each child gets its input from the previous child failure
                    return function(input) {
                        var chain = Promise.reject(input);
                        node.nodes.forEach(function(child){
                            chain = chain.then(
                                function onSuccess(inp){
                                    return Promise.resolve(inp);
                                },
                                function onFailure(inp){
                                    return runNode(child,scope)(inp);
                                }
                            );
                        });
                        return chain;
                    }
                    break;

                case 'invert':
                    // Invert decorator. Execute the first child node
                    // If child returned a result as success, return this result as failure
                    // If child returned a result as failure, return this result as success
                    return function(input) {
                        var child = node.nodes[0];
                        return runNode(child,scope)(input).then(
                            function onSuccess(inp){
                                return Promise.reject(inp);
                            },
                            function onFailure(inp){
                                return Promise.resolve(inp);
                            }
                        );
                    }
                    break;

                case 'success':
                    // Success Decorator. Execute the first child node
                    // Return its success or failure result as a success
                    return function(input) {
                        var child = node.nodes[0];
                        return runNode(child,scope)(input).then(
                            function onSuccess(res){
                                return Promise.resolve(res);
                            },
                            function onFailure(res){
                                return Promise.resolve(res);
                            }
                        );
                    }
                    break;

                case 'failure':
                    // Success Decorator. Execute the first child node
                    // Return its success or failure result as a success
                    return function(input) {
                        var child = node.nodes[0];
                        return runNode(child,scope)(input).then(
                            function onSuccess(res){
                                return Promise.reject(res);
                            },
                            function onFailure(res){
                                return Promise.reject(res);
                            }
                        );
                    }
                    break;
                    
                case 'par':
                    // Execute all childs in parallel. 
                    // Consider maxSuccess, maxFail, waitForMe, waitForAll
                    // Result is Success when maxSuccess is satisfied (output value is the output value of the last child node that succeeded)
                    // Result is Failure when maxFailure is satisfied (output value is the output value of the last child node that failed)
                    // If neither maxSuccess nor maxFailure satisfied but all child nodes returned, return with the result and the output value of the last child node
                    // Each child gets the same input from the parent parallel container input
/*                    
 * TODO
                    var parallel = Promise.reject(input);
                    
                    node.nodes.forEach(function(child){
                        chain = chain.then(
                            function onSuccess(inp){
                                return Promise.resolve(inp);
                            },
                            function onFailure(inp){
                                return runNode(child,scope)(inp);
                            }
                        );
                    });
*/                    
                    break;


            }
            
        };
        
    // Init object
    
        this.config = treeConfig;
        
        // Convert root according to rootFormat
        this.root = treeConfig.root || (this.error = 'No root found');
        this.rootFormat = treeConfig.rootFormat ||  (typeof this.root === 'object' ? 'object': 'json');
        switch (this.rootFormat) {
            case 'object':
                // Do nothing, tree is ready. Of course, it needs to be prepared before execution
                break;
            case 'json':
                this.root = JSON.parse(this.root);
                break;
            case 'jsonfile':
                this.root = JSON.parse(fs.readFileSync(this.root,'utf8'));
                break;
            case 'yaml':
                this.root = yaml.safeLoad(this.root);
                break;
            case 'yamlfile':
                this.root = yaml.safeLoad(fs.readFileSync(this.root,'utf8'));
                break;
            default: 
                this.error = 'Unknown rootFormat';
                return;
                break;
        }
        
        
        this.actions = treeConfig.actions || {};
        this.prepare(this.root,{actionType:'plain'});
        // console.log(this.root);
        
        // Run the tree
        this.run = function(input){ 
            return runNode(_this.root, {})(input);
        }
        
}

