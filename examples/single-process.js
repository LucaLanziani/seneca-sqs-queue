var seneca = require('seneca')().use(require('../'), {recv_params: {WaitTimeSeconds: 1}});
var numbers = [1, 2];

function startQueue () {
  seneca.act({ role: 'queue', type: 'sqs', cmd: 'start' });
}

function stopQueue () {
  seneca.act({ role: 'queue', type: 'sqs', cmd: 'stop' });
}

seneca.add({
  role: 'queue',
  type: 'sqs',
  evnt: 'empty'
}, function (args, done) {
  console.log('empty');
  stopQueue();
});

seneca.add({
  role: 'queue',
  type: 'sqs',
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

  args._deleteMessage(function (err, data) {
    if (err) {
      console.error(err);
    }
    next();
  });
});

seneca.add({
  task: 'my task',
  param: 2
}, function (args, next) {
  console.log(2, args.param);

  args._deleteMessage(function (err, data) {
    if (err) {
      console.error(err);
    }
    next();
  });
});

numbers.forEach(function (number) {
    seneca.act({ role: 'queue', type: 'sqs', cmd: 'enqueue', msg: {task: 'my task', param: number}});
});

startQueue();

seneca.listen();