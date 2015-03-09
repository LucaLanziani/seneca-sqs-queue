var AWS = require('aws-sdk'),
    async = require('async');

function queue (role, seneca, options) {
  'use strict';
  AWS.config.update(options);

  var sqs = new AWS.SQS();
  var please_stop = true;
  var stopped = true;
  var type = 'sqs';
  var send_params = seneca.util.deepextend({
    DelaySeconds: 0
  }, options.send_params);
  var recv_params = seneca.util.deepextend({
    MaxNumberOfMessages: 1,
    VisibilityTimeout: 40,
    WaitTimeSeconds: 3
  }, options.recv_params);

  function sendMessage (args, cb) {
    var message = JSON.stringify(args.msg);
    var params = seneca.util.deepextend(send_params, {MessageBody: message});

    sqs.sendMessage(params, cb);
  }

  function receiveMessage (args, cb) {
    var params = seneca.util.deepextend(recv_params, args);

    return sqs.receiveMessage(params, cb);
  }

  function deleteMessage (receiptHandle, cb) {
    return sqs.deleteMessage({
      QueueUrl: options.queueUrl,
      ReceiptHandle: receiptHandle
    }, cb);
  }

  function notifyMessage (params, cb) {
    return seneca.act(params, cb);
  }

  function notifyEmpty () {
    return seneca.act({role:role, evnt: 'empty', type: 'sqs'});
  }

  function notifyStopped () {
    stopped = true;
    seneca.log.debug('Stopping the receiver');
    return seneca.act({role: role, evnt: 'stopped', type: 'sqs'});
  }

  function adaptMessage (message) {
    return seneca.util.deepextend({
      _type: 'message',
      _message: message,
      _deleteMessage: function(cb) {
        return deleteMessage(message.ReceiptHandle, cb);
      }
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

      if (please_stop) {
        return notifyStopped();
      }

      return async.nextTick(function() {
        return readQueue(args);
      });
    });
  }


  seneca.add({
    role: role,
    type: type,
    cmd: 'enqueue'
  }, function (args, done) {
    if (!args.msg) {
      return done(new Error('no message specified'));
    }
    sendMessage(args, done);
  });

  seneca.add({
    role: role,
    type: type,
    cmd: 'start'
  }, function (args, done) {
    if (please_stop) {
      please_stop = false;
      readQueue({});
    }
    done();
  });

  seneca.add({
    role: role,
    type: type,
    cmd: 'stop'
  }, function (args, done) {
    if (stopped) {
      notifyStopped();
    }
    please_stop = true;
    done();
  });

  function ignoreNotification (evnt) {
    return seneca.add({
      role: role,
      type: type,
      evnt: evnt
    }, function (args, done) {
      done();
    });
  }

  ignoreNotification('empty');
  ignoreNotification('stopped');

}


module.exports = queue;

