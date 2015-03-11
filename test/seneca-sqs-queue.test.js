var expect = require('chai').expect;

describe('Given a process environment', function () {
  'use strict';

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
      var seneca = require('seneca')().use(queue, {recvParams: {WaitTimeSeconds: 1}});

      function startQueue () {
        seneca.act({role: 'queue', cmd: 'start'});
      }

      function stopQueue () {
        seneca.act({role: 'queue', cmd: 'stop'});
      }

      function sendTask (number) {
        seneca.act({ role: 'queue', cmd: 'enqueue', msg: {type: 'task', number: number}});
      }

      function onTask (cb) {
        seneca.add({type:'task'}, cb);
      }

      function pass() {}

      function onceOnEvnt (evnt, cb) {
        var on = {
          role: 'queue',
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

        onTask(function (args, next) {
          console.log('here');
          next();
        });

        onceOnEvnt('empty', stopQueue);
        onceOnEvnt('stopped', done);
        startQueue();
      });

      afterEach(function (done) {

        onceOnEvnt('stopped', done);
        stopQueue();
      });

      it('it should emit a stop event if already stopped', function (done) {
        onceOnEvnt('stopped', done);
        stopQueue();
      });

      it('it should emit an empty event', function (done) {
        onceOnEvnt('empty', done);
        startQueue();
      });

      it('it can send receive and delete a task', function (done) {
        var number = Math.random();
        onTask(function (args, next) {
          expect(args.number).to.be.equal(number);
          next();
          done();
        });

        sendTask(number);
        startQueue();
      });

      it('it can send and receive multiple tasks', function (done) {
        this.timeout(10000);
        var numbers = [Math.random(), Math.random(), Math.random()];
        var received = [];
        var numberOfMessages = 0;
        onceOnEvnt('empty', function (cb) {
          received.forEach( function (number) {
            expect(numbers).to.include(number);
          });
          expect(numberOfMessages).to.be.equal(numbers.length);
          done();
        });

        onTask(function (args, next) {
          received.push(args.number);
          numberOfMessages += 1;
          next();
        });

        numbers.forEach( function (number) {
          sendTask(number);
        });
        startQueue();
      });
    });
  });
});
