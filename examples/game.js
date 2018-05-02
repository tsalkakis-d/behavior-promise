// GAME AI EXAMPLE
// Slightly better that example in README.md
// Exports an options object

// Debug/Report
function report(msg) {
    console.log(msg)
}

// Initial status of a door may be one of:
var statusDetails = {
    // Door is already open
    open: {open: true, locked: false, haveKey: undefined, kickable: undefined},
    // Door is closed, but we may just open it
    closed: {open: false, locked: false, haveKey: undefined, kickable: undefined},
    // Door is locked, but we have the key
    locked: {open: false, locked: true, haveKey: true, kickable: undefined},
    // Door is locked and we don't have the key, but will fall if kicked
    kickable: {open: false, locked: true, haveKey: false, kickable: true},
    // Door is locked, can't be unlocked and can't be damaged by kicking
    rock: {open: false, locked: true, haveKey: false, kickable: false},
}

module.exports = {
    root: {
        debug: false,
        actionType: 'boolean',
        scope: {
            vars: {
                doorStatus: null,
                open: null,
                locked: null
            }
        },
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
        readInput: function(args) { // Read execution input, init scope vars according to input
            if (!statusDetails[args.doorStatus]) {
                report (`Uknown doorStatus ${args.doorStatus}`);
                return false;
            }
            report('');
            report(`INITIAL STATUS IS ${args.doorStatus}`);
            this.vars.doorStatus = args.doorStatus;
            this.vars.open = statusDetails[this.vars.doorStatus].open;
            this.vars.locked = statusDetails[this.vars.doorStatus].locked;
            return true;
        },
        door: {
            isOpen: function(){
                report(`Door is ${this.vars.open?'':'not '}open`)
                return this.vars.open;
            },
            isLocked: function(){
                report(`Door is ${this.vars.locked?'':'not '}locked`)
                return this.vars.locked;
            },
            open: function(){ 
                if (!this.vars.locked) 
                    this.vars.open = true;
                report('door.open()....' + (this.vars.open ? 'OK' : 'FAILED')); 
                return true;    // Doesn't matter
            },
            unlock: function(){ 
                if (statusDetails[this.vars.doorStatus].haveKey) 
                    this.vars.locked = false;
                report('door.unlock()....' + (this.vars.locked ? 'FAILED' : 'OK')); 
                return true;    // Doesn't matter
            },
            kick: function(){ 
                if (statusDetails[this.vars.doorStatus].kickable) {
                    this.vars.locked = false;
                    this.vars.open = true;
                }
                report('door.kick()....' + (this.vars.open ? 'OK' : 'FAILED')); 
                return true;    // Doesn't matter
            },
        },
        room: {
        	moveInto: function(){
                report('room.moveInto()');
                return true;
            },
        	abandon: function(){
                report('room.abandon()');
                return true;
            },
        },
    }
}
