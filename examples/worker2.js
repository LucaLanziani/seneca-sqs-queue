'use strict';

var seneca = require('seneca')().use(require('../'));

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
  task: 'my task'
}, function (args, next) {
  console.log(2, args.param);
  next();
});

startQueue();

seneca.listen(3001);