var seneca = require('seneca')().use(require('../'), {recv_params: {WaitTimeSeconds: 1}});
var numbers = [1, 2];

function startQueue () {
  seneca.act({ role: 'queue', cmd: 'start' });
}

function stopQueue () {
  seneca.act({ role: 'queue', cmd: 'stop' });
}

seneca.add({
  role: 'queue',
  evnt: 'empty'
}, function (args, done) {
  console.log('empty');
  stopQueue();
});

seneca.add({
  role: 'queue',
  evnt: 'stopped'
}, function (args, done) {
  console.log('stopped');
  process.exit();
});

seneca.add({
  task: 'my task',
  param: 1
}, function (args, next) {
  console.log(1, args.param);
  next();
});

seneca.add({
  task: 'my task',
  param: 2
}, function (args, next) {
  console.log(2, args.param);
  next();
});

numbers.forEach(function (number) {
    seneca.act({ role: 'queue', cmd: 'enqueue', msg: {task: 'my task', param: number}});
});

startQueue();

seneca.listen();