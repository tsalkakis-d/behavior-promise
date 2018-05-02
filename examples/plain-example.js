module.exports = {
        title: 'SEQ1',
        seq: [
            {title:'SEQ2', seq:[
                    {title:'LOG2',action:'actions.log2', actionType:'callback'},
                    {title:'LOG1',action:'actions.log1', scope:{x:14}},
                ]
            },
            {title:'TEST1',action:'action1Promise', actionType:'promise'},
            {title:'TEST2',action:'action2', actionType: 'boolean'},
            {title:'TEST3',action:'actions.log1', scope:{x:21}},
            {title:'TEST4',action:'actions.log2', actionType:'callback'},
            'setN',
            {
                actionType: 'callback',
                sel: [
                    {title:'SEL(1)',action:'selN', scope:{x:1}},
                    {title:'SEL(2)',action:'selN', scope:{x:2}},
                    {title:'SEL(3)',action:'selN', scope:{x:3}},
                ],
            },
        ],
        
    };