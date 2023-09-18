import { RabbitExchangeConsumer, RabbitQueueConsumer } from '~rabbit/rabbit-consumer';

const { EXCHANGE_NAME } = process.env;
if (!EXCHANGE_NAME) throw new Error('Missing environment variables!');

const TEST_QUEUE = 'test';

let receivedCount = 0;

const getRandomDelay = (min = 5, max = 15): number => Math.floor(Math.random() * (max - min + 1)) + min;

const cb = async (message: string) => {
  console.log(`[${++receivedCount}] Received: ${message}`);

  // Wait for some time
  await new Promise((r) => setTimeout(() => r(null), getRandomDelay(10, 20) * 1000));

  return {
    original: message,
    data: {
      processed: `Processed ${message}`,
      size: message.length
    }
  };
}

const setUp = async (): Promise<void> => {
  try {
    // Consume messages on the fanout exchange
    const exchangeConsumer = new RabbitExchangeConsumer();
    await exchangeConsumer.consumeExchange(EXCHANGE_NAME, cb);

    // Consume messages on the test queue
    const queueConsumer = new RabbitQueueConsumer();
    await queueConsumer.consumeQueue(TEST_QUEUE, cb);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

setUp().then(() => {
  console.log('Consumer is waiting for messages..');
});