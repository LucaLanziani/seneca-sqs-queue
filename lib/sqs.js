var AWS = require('aws-sdk'),
    async = require('async');

function queue (role, seneca, options) {
  'use strict';

  AWS.config.update(options);

  var sqs = new AWS.SQS();
  var pleaseStop = true;
  var stopped = true;
  var sendParams = seneca.util.deepextend({
    DelaySeconds: 0
  }, options.sendParams);
  var recvParams = seneca.util.deepextend({
    MaxNumberOfMessages: 1,
    VisibilityTimeout: 40,
    WaitTimeSeconds: 3
  }, options.recvParams);

  function sendMessage (args, cb) {
    var message = JSON.stringify(args.msg);
    var params = seneca.util.deepextend(sendParams, {MessageBody: message});

    sqs.sendMessage(params, cb);
  }

  function receiveMessage (args, cb) {
    var params = seneca.util.deepextend(recvParams, args);

    return sqs.receiveMessage(params, cb);
  }

  function deleteMessage (receiptHandle, cb) {
    return sqs.deleteMessage({
      QueueUrl: options.queueUrl,
      ReceiptHandle: receiptHandle
    }, cb);
  }

  function notifyMessage (params, cb) {
    return seneca.act(params, function (err) {
      if (err) {
        return cb(err);
      }
      return deleteMessage(params._message.ReceiptHandle, cb);
    });
  }

  function notifyEmpty () {
    return seneca.act({role:role, evnt: 'empty'});
  }

  function notifyStopped () {
    stopped = true;
    seneca.log.debug('Stopping the receiver');
    return seneca.act({role: role, evnt: 'stopped'});
  }

  function adaptMessage (message) {
    return seneca.util.deepextend({
      _type: 'message',
      _message: message,
    }, message.Body);
  }

  function readQueue (args) {
    stopped = false;

    return async.waterfall([
      function fetchSQSMessage(next) {
        return receiveMessage(args, next);
      },
      function extractMessages(queue, next) {
        if (!queue.Messages) {
          notifyEmpty();
          return next(null);
        }

        return async.eachSeries(queue.Messages, function(message, next) {
          try {
            message.Body = JSON.parse(message.Body);
          } catch (e) {
            return next('Message ' + message + 'is not JSON');
          }

          return notifyMessage(adaptMessage(message), next);
        }, function () {
          return next(null);
        });
      }
    ], function (err) {
      if (err) {
        seneca.log.error(err);
      }

      if (pleaseStop) {
        return notifyStopped();
      }

      return async.nextTick(function() {
        return readQueue(args);
      });
    });
  }


  seneca.add({
    role: role,
    cmd: 'enqueue'
  }, function (args, done) {
    if (!args.msg) {
      return done(new Error('no message specified'));
    }
    sendMessage(args, done);
  });

  seneca.add({
    role: role,
    cmd: 'start'
  }, function (args, done) {
    if (pleaseStop) {
      pleaseStop = false;
      readQueue({});
    }
    done();
  });

  seneca.add({
    role: role,
    cmd: 'stop'
  }, function (args, done) {
    if (stopped) {
      notifyStopped();
    }
    pleaseStop = true;
    done();
  });

  function ignoreNotification (evnt) {
    return seneca.add({
      role: role,
      evnt: evnt
    }, function (args, done) {
      done();
    });
  }

  ignoreNotification('empty');
  ignoreNotification('stopped');

}


module.exports = queue;


