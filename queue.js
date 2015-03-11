
var sqs = require('./lib/sqs');

function queue(options) {
  'use strict';

  var seneca = this;  // jshint ignore:line
  var region = process.env.REGION;
  var queueUrl = process.env.QUEUE_URL;

  options = seneca.util.deepextend({
    role: 'queue',
    region: region,
    queueUrl: queueUrl,
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
