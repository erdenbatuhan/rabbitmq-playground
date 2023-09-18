import express from 'express';

import { RabbitExchangeProducer, RabbitQueueProducer } from '~rabbit/rabbit-producer';

const { PORT, EXCHANGE_NAME } = process.env;
if (!PORT || !EXCHANGE_NAME) throw new Error('Missing environment variables!');

const TEST_QUEUE = 'test';

const app = express();
app.use(express.json());

let rabbitProducers: { fanoutExchangeProducer: RabbitExchangeProducer, queueProducer: RabbitQueueProducer };

app.get('/', async (req, res) => {
  res.status(200).send('Health check succeeds!');
});

app.post('/broadcast', async (req, res) => {
  const { message } = req.body;

  await rabbitProducers.fanoutExchangeProducer.sendExchange(
    EXCHANGE_NAME,
    Buffer.from(message),
    async (message) => {
      console.log(`(CALLBACK - EXCHANGE) Received response: ${message}`);
    },
    { waitForAllCustomers: true }
  );

  res.status(200).send(`Broadcast message (${message}) sent to RabbitMQ`);
});

app.post('/send', async (req, res) => {
  const { message } = req.body;

  await rabbitProducers.queueProducer.sendToQueue(
    TEST_QUEUE,
    Buffer.from(message),
    async (message) => {
      console.log(`(CALLBACK - QUEUE) Received response: ${message}`);
    }
  );

  res.status(200).send(`Queue message (${message}) sent to RabbitMQ`);
});

app.listen(PORT, async () => {
  rabbitProducers = {
    fanoutExchangeProducer: await RabbitExchangeProducer.setUp(EXCHANGE_NAME, 'fanout'), // Fanout Exchange
    queueProducer: await RabbitQueueProducer.setUp(TEST_QUEUE)
  }

  console.log(`Producer listening at http://localhost:${PORT}`);
});
