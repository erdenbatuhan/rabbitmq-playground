import type { Channel } from 'amqplib';

import RabbitConstants from './rabbit-constants';
import RabbitInstance from "./rabbit-instance";

export default class RabbitProducer {

  protected outgoingChannel!: Channel;
  protected replyChannel!: Channel;
  public consumers: Map<string, string> = new Map();

  protected static generateCorrelationId = (): string => Math.random().toString(36).split('.')[1];

  protected setUpChannels = async (): Promise<void> => {
    // Establish channels if they haven't been created previously
    this.outgoingChannel = this.outgoingChannel || await RabbitInstance.createChannel();
    this.replyChannel = this.replyChannel || await RabbitInstance.createChannel();
  };

  private removeConsumer = async (correlationId: string): Promise<void> => {
    const consumer = this.consumers.get(correlationId);
    if (!consumer) return;

    console.log(`[${correlationId}] Removing the consumer.`)

    await this.replyChannel.cancel(consumer)
      .then(() => console.log(`[${correlationId}] Successfully removed the consumer.`))
      .catch((err) => console.error(`[${correlationId}] Could not remove the consumer: ${(err as Error).message}`));

    this.consumers.delete(correlationId);
  }

  protected waitForReply = async (
    correlationId: string,
    replyQueue: string,
    replyCallback: (message: string) => Promise<void>,
    { waitForAllCustomers, numRepliers = 1 }: { waitForAllCustomers?: boolean; numRepliers?: number | null; } = {}
  ): Promise<void> => {
    try {
      console.log(`[${correlationId}] Waiting for the reply message(s) on the queue '${replyQueue}'.`);
      await this.replyChannel.assertQueue(replyQueue, { autoDelete: true, durable: false });

      // Consume messages on the reply queue
      let numMessagesReceived = 0;
      const { consumerTag } = await this.replyChannel.consume(replyQueue, (message) => {
        // Check if the message exists; if not, return
        if (!message) return;

        // Verify if the message doesn't come from a different sender (with a different correlation ID); if not, send "nack" message and return
        if (message.properties.correlationId !== correlationId) return this.replyChannel.nack(message, false, true);

        // If all customers are being awaited, check if all the responses have been received
        numMessagesReceived += 1;
        if (waitForAllCustomers && numMessagesReceived !== numRepliers) return;

        replyCallback(message.content.toString()).then(() => {
          console.log(`[${correlationId}] Consumed ${numMessagesReceived} reply message(s) on the queue '${replyQueue}' (Last reply = ${message.content.toString()}).`);
        }).catch((err: Error | unknown) => {
          console.error(`[${correlationId}] Could not consume reply message(s) on the queue '${replyQueue}': ${(err as Error).message}`);
        }).finally(() => {
          // Send "ack" message and remove consumer
          this.replyChannel.ack(message);
          this.removeConsumer(correlationId);
        });
      });

      // Save consumer to the map
      this.consumers.set(correlationId, consumerTag);

      // Set time-to-live for the consumer
      setTimeout(() => {
        this.removeConsumer(correlationId)
      }, RabbitConstants.CONSUMER_TTL);
    } catch (err: Error| unknown) {
      console.error(err);
      await this.removeConsumer(correlationId);
    }
  };
}

export class RabbitExchangeProducer extends RabbitProducer {

  public static setUp = async (
    outgoingExchange: string,
    exchangeType: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string
  ): Promise<RabbitExchangeProducer> => {
    const instance = new RabbitExchangeProducer();

    await instance.setUpChannels();
    await instance.outgoingChannel.assertExchange(outgoingExchange, exchangeType, { durable: false });

    return instance;
  }

  private getNumQueuesBoundToExchange = (outgoingExchange: string): Promise<number> => RabbitInstance.getQueues()
    .then((queues) => queues.filter((queue) => queue.arguments.exchange === outgoingExchange).length);

  public sendExchange = async (
    outgoingExchange: string,
    content: Buffer,
    replyCallback: (message: string) => Promise<void>,
    { waitForAllCustomers }: { waitForAllCustomers?: boolean } = {}
  ): Promise<string> => {
    const correlationId = RabbitProducer.generateCorrelationId(); // Generate correlation ID
    const replyQueue = `reply_exchange_${outgoingExchange}`

    // Get the number of queues bound to this exchange (a.k.a. the number of repliers)
    const numRepliers = waitForAllCustomers ? await this.getNumQueuesBoundToExchange(outgoingExchange) : null;

    // Wait for replies
    await this.waitForReply(correlationId, replyQueue, replyCallback, { waitForAllCustomers, numRepliers });

    // Send the message to the exchange
    this.outgoingChannel.publish(outgoingExchange, '', content, { correlationId, replyTo: replyQueue });
    console.log(`[${correlationId}] Sent a message to the exchange '${outgoingExchange}' (Message = ${content.toString()}).`);

    return correlationId;
  };
}

export class RabbitQueueProducer extends RabbitProducer {

  public static setUp = async (outgoingQueue: string): Promise<RabbitQueueProducer> => {
    const instance = new RabbitQueueProducer();

    await instance.setUpChannels();
    await instance.outgoingChannel.assertQueue(outgoingQueue, { autoDelete: true, durable: false });

    return instance;
  }

  public sendToQueue = async (
    outgoingQueue: string,
    content: Buffer,
    replyCallback: (message: string) => Promise<void>
  ): Promise<string> => {
    const correlationId = RabbitProducer.generateCorrelationId(); // Generate correlation ID
    const replyQueue = `reply_${outgoingQueue}`

    // Wait for replies
    await this.waitForReply(correlationId, replyQueue, replyCallback);

    // Send the message to the queue
    this.outgoingChannel.sendToQueue(outgoingQueue, content, { correlationId, replyTo: replyQueue });
    console.log(`[${correlationId}] Sent a message to the queue '${outgoingQueue}' (Message = ${content.toString()}).`);

    return correlationId;
  };
}
