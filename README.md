# seneca-queue

A SQS job queue plugin for Seneca

It support send/receive messages to/from a given Amazon SQS queue.

In order to receive a message you should add a Seneca patter that will match the message you are sending i.e:

  ```js
  seneca.add({type: 'task'}, function (args, next) {
    console.log(args);
    next();  // This is needed to receive the next message
  })
  ```
and then start the receiver with:

  ```js
  seneca.act({role: 'queue', type: 'sqs', cmd: 'start'});
  ```

this will receive all the messages containing a `type` key with the `task` value, to send a message like this use:

  ```js
  seneca.act({role: 'queue', type: 'sqs', cmd: 'enqueue', msg: {type: 'task', number '42'}});
  ```

you can stop the queue with:

  ```js
  seneca.act({role: 'queue', type: 'sqs', cmd: 'stop'});
  ```

## Attention

You should delete the message from the SQS queue after you have done with it if you don't want receive it again, to do that you can use the method `_deleteMessage` of the args object:

  ```js
  seneca.add({type: 'task'}, function (args, next) {
    console.log(args);
    args._deleteMesssage(next); //next will be called after the message is deleted;
  });
  ```

## Events

As you may suspect, when we stop the receiver it doesn't stop right away.
If we want to execute and action when the receiver is stopped we can subscribe to the 'stopped' event

  ```js
  seneca.add({
      role: 'queue',
      type: 'sqs',
      evnt: 'stopped'
    }, function () {
      console.log("RECEIVER STOPPED");
  });
  ```

You can do the same for the `empty` event, it is emitted every time the receiver time out waiting for a message.


# Test

To run the tests you need to create a `config/test_env` file using `config/example_env` as example and provide all the required information
The you can run:

  ```js
  npm test
  ```

# Acknowledgements

Sponsored by [nearForm](http://www.nearform.com/)

##
## License

MIT
