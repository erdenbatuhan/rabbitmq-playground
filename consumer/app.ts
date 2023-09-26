import RabbitExchangeConsumer from "@rabbitmq/RabbitExchangeConsumer";
import RabbitQueueConsumer from '@rabbitmq/RabbitQueueConsumer';

const { EXCHANGE_NAME, QUEUE_NAME } = process.env;
if (!EXCHANGE_NAME || !QUEUE_NAME) throw new Error('Missing environment variables!');

let receivedCount = 0;

const getRandomDelay = (min = 5, max = 15): number => Math.floor(Math.random() * (max - min + 1)) + min;

const cb = async (message: string) => {
  // Wait for some time and then send the response back
  console.log(`[${++receivedCount}] Received: ${message}`);
  return new Promise<object>((resolve) => setTimeout(() => (
    resolve({
      original: message,
      data: { processed: `Processed ${message}`, size: message.length }
    })
  ), getRandomDelay(10, 20) * 1000));
}

Promise.all([
  // Consume messages on the fanout exchange
  RabbitExchangeConsumer.create(EXCHANGE_NAME, 10, 'fanout')
    .then((exchangeConsumer) => exchangeConsumer.consumeExchange(cb)),
  // Consume messages on the test queue
  RabbitQueueConsumer.create(QUEUE_NAME, 10)
    .then((queueConsumer) => queueConsumer.consumeQueue(cb))
]).then(() => {
  console.log(`The consumer is now waiting for messages!`);
}).catch((err: Error | unknown) => {
  console.error(err);
  throw err;
});
