import express from 'express';
import type { Request, Response } from 'express';

import RabbitExchangeProducer from "@rabbitmq/RabbitExchangeProducer";
import RabbitQueueProducer from "@rabbitmq/RabbitQueueProducer";

const { PORT, EXCHANGE_NAME, QUEUE_NAME } = process.env;
if (!PORT || !EXCHANGE_NAME || !QUEUE_NAME) throw new Error('Missing environment variables!');

let rabbitProducers: { fanoutExchangeProducer: RabbitExchangeProducer; queueProducer: RabbitQueueProducer };

const cb = (channel: string) => async (message: string): Promise<void> => {
  console.log(`Received back response from ${channel}: ${message}`);
};

const broadcast = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;

  rabbitProducers.fanoutExchangeProducer
    .sendExchange(Buffer.from(message), cb(EXCHANGE_NAME), { waitForAllCustomers: true })
    .then(() => res.status(200).send(`Broadcast message (${message}) sent to RabbitMQ`));
};

const send = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;

  rabbitProducers.queueProducer
    .sendToQueue(Buffer.from(message), cb(QUEUE_NAME))
    .then(() => res.status(200).send(`Queue message (${message}) sent to RabbitMQ`));
};

const app = express();
app.use(express.json());

// Endpoints
app.get('/', async (_: Request, res: Response): Promise<void> => { res.status(200).send('Health check succeeds!'); });
app.post('/broadcast', broadcast);
app.post('/send', send);

app.listen(PORT, async () => {
  rabbitProducers = {
    fanoutExchangeProducer: await RabbitExchangeProducer.create(EXCHANGE_NAME, 'fanout', 10), // Fanout Exchange
    queueProducer: await RabbitQueueProducer.create(QUEUE_NAME, 10)
  }

  console.log(`The producer is now listening on port ${PORT}!`);
});
