
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
module.exports = {
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
                this.in.a = args.a
                this.in.b = args.b
                this.in.c = args.c
                this.out.roots = []
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
            zero:           function(x) { if (!(x==0)) throw false; }
        },
        
        // Value getters
        get: {
            a:              function()  { return this.in.a },
            b:              function()  { return this.in.b },
            c:              function()  { return this.in.c },
            discriminant:   function()  { return this.med.d }
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
                this.out.roots.push('*');
            },
            noSolution: function() {
                this.out.description = 'There are no solutions';
                this.out.roots.push('-');
            },
        },
    }
}
