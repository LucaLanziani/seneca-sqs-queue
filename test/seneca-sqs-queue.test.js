var expect = require('chai').expect;

describe('Given a process environment', function () {

  beforeEach('it should contain non empty QUEUE_URL and AWS REGION', function (done) {
    expect(process.env).to.have.property('REGION').and.to.not.be.empty; // jshint ignore:line
    expect(process.env).and.to.have.property('QUEUE_URL').and.to.not.be.empty; // jshint ignore:line
    done();
  });

  describe('Given a AWS-SDK object', function () {
    var aws;

    beforeEach(function (done) {
      aws = require('aws-sdk');
      done();
    });

    it('it should have credentials', function(done) {
      expect(aws.config.credentials).to.not.equal(
        null,
        'aws-sdk cannot load credentials (~/.aws/credentials file missing?)'
      );

      done();
    });

    describe('Given a seneca object with sqs-queue plugin and and empty queue', function () {
      var queue = require('../');
      var seneca = require('seneca')().use(queue, {recv_params: {WaitTimeSeconds: 1}});

      function startQueue () {
        seneca.act({role: 'queue', type: 'sqs', cmd: 'start'});
      }

      function stopQueue () {
        seneca.act({role: 'queue', type: 'sqs', cmd: 'stop'});
      }

      function sendTask (number) {
        seneca.act({ role: 'queue', type: 'sqs', cmd: 'enqueue', msg: {type: 'task', number: number}});
      }

      function on_task (cb) {
        seneca.add({type:'task'}, cb);
      }

      function pass() {}

      function once_on_evnt (evnt, cb) {
        var on = {
          role: 'queue',
          type: 'sqs',
          evnt: evnt
        };
        seneca.add(on, function () {
          seneca.add(on, pass);
          cb();
        });
      }

      // Remove all the tasks from the queue and stop the receiver
      beforeEach(function (done) {
        this.timeout(10000);

        on_task(function (args, next) {
          args._deleteMessage(next);
        });

        once_on_evnt('empty', stopQueue);
        once_on_evnt('stopped', done);
        startQueue();
      });

      afterEach(function (done) {
        this.timeout(10000);

        once_on_evnt('stopped', done);
        stopQueue();
      });

      it('it should emit a stop event if already stopped', function (done) {
        once_on_evnt('stopped', done);
        stopQueue();
      });

      it('it should emit an empty event', function (done) {
        once_on_evnt('empty', done);
        startQueue();
      });

      it('it can send receive and delete a task', function (done) {
        var number = Math.random();
        on_task(function (args, next) {
          expect(args.number).to.be.equal(number);
          args._deleteMessage(done);
          next();
        });

        sendTask(number);
        startQueue();
      });

      it('it can send and receive multiple tasks', function (done) {
        this.timeout(5000);
        var numbers = [Math.random(), Math.random(), Math.random()];
        var received = [];
        var number_of_messages = 0;
        once_on_evnt('empty', function (cb) {
          received.forEach( function (number) {
            expect(numbers).to.include(number);
          });
          expect(number_of_messages).to.be.equal(numbers.length);
          done();
        });

        on_task(function (args, next) {
          received.push(args.number);
          number_of_messages += 1;
          args._deleteMessage(next);
        });

        numbers.forEach( function (number) {
          sendTask(number);
        });
        startQueue();
      });
    });
  });
});
