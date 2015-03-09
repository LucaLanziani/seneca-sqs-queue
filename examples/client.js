var seneca = require('seneca')().use(require('../'));
var numbers = [1, 2];

numbers.forEach(function (number) {
    seneca.act({ role: 'queue', type: 'sqs', cmd: 'enqueue', msg: {task: 'my task', param: number}});
});

seneca.client();
