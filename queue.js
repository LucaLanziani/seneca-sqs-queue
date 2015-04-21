
var sqs = require('./lib/sqs'),
    assert = require('assert');

function queue(options) {
  'use strict';

  assert(options, 'missing options');
  assert(options.queueUrl, 'missing queueUrl');

  var seneca = this;  // jshint ignore:line
  var queueUrl = options.queueUrl;

  options = seneca.util.deepextend({
    role: 'queue',
    sendParams: {
      QueueUrl: queueUrl
    },
    recvParams: {
      QueueUrl: queueUrl
    }
  }, options);

  // You can change the _role_ value for the plugin patterns.
  // Use this when you want to load multiple versions of the plugin
  // and expose them via different patterns.
  var role = options.role;

  sqs(role, seneca, options);

  seneca.add({init:role},function(args,done){
    done();
  });

  return {
    name: role
  };
}

module.exports = queue;
