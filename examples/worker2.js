var seneca = require('seneca')().use(require('../'));

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
  task: 'my task'
}, function (args, next) {
  console.log(2, args.param);

  args._deleteMessage(function (err, data) {
    if (err) {
      console.error(err);
    }
    next();
  });
});

startQueue();

seneca.listen(3001);