import amqp from 'amqplib';
import type { Connection, Channel, ConsumeMessage } from 'amqplib';

import RabbitConstants from './rabbit-constants';

const { RABBITMQ_HOST } = process.env;
if (!RABBITMQ_HOST) throw new Error('Missing environment variables!');

class RabbitInstance {

  private static connection: Connection;

  public static getConnection = async (): Promise<Connection> => {
    if (!RabbitInstance.connection) {
      RabbitInstance.connection = await amqp.connect(`amqp://${RABBITMQ_HOST}`);
    }

    return RabbitInstance.connection;
  };

  public static createChannel = async (
    prefetchCount: number = RabbitConstants.CHANNEL_PREFETCH_COUNT
  ): Promise<Channel> => {
    const amqpConnection = await RabbitInstance.getConnection();
    const channel = await amqpConnection.createChannel();

    // Set prefetch count
    await channel.prefetch(prefetchCount, false);

    return channel;
  }
}

export default class RabbitConsumer {

  protected incomingChannel!: Channel;
  protected outgoingChannel!: Channel;
  protected consumers: Map<string, string[]> = new Map();

  protected setUpChannels = async (): Promise<void> => {
    // Establish channels if they haven't been created previously
    this.incomingChannel = this.incomingChannel || await RabbitInstance.createChannel();
    this.outgoingChannel = this.outgoingChannel || await RabbitInstance.createChannel();
  };

  protected removeConsumer = async (consumer?: string): Promise<void> => {
    if (!consumer) return;

    console.log(`Removing the consumer '${consumer}'.`)

    await this.incomingChannel.cancel(consumer)
      .then(() => console.log(`Successfully removed the consumer '${consumer}'.`))
      .catch((err) => console.error(`Could not remove the consumer '${consumer}': ${(err as Error).message}`));
  }

  private sendBackResponse = (consumer: string, message: ConsumeMessage, content: Buffer): boolean => {
    console.log(`Sending back the response to the queue '${message.properties.replyTo}' as ${consumer} (Content=${content.toString()}).`);

    return this.outgoingChannel.sendToQueue(
      message.properties.replyTo,
      content,
      { correlationId: message.properties.correlationId }
    );
  }

  protected consumeIncomingMessage = async (
    incomingQueue: string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    const { consumerTag } = await this.incomingChannel.consume(incomingQueue, (message) => {
      console.log(`Consuming an incoming message on the queue '${incomingQueue}'.`);

      // Check if the message exists; if not, return
      if (!message) return;

      // Call the message callback, and then send back the response
      messageCallback(message.content.toString()).then((response) => {
        console.log(`Consumed an incoming message on the queue '${incomingQueue}'.`);
        this.sendBackResponse(consumerTag!, message, Buffer.from(JSON.stringify(response)))
      }).catch((err: Error| unknown) => {
        console.log(`Could not consume an incoming message on the queue '${incomingQueue}': ${(err as Error).message}`);
      }).finally(() => {
        // Send an "ack" message and remove the consumer if requested
        this.incomingChannel.ack(message);
        if (removeConsumerImmediately) this.removeConsumer(consumerTag!);
      });
    });

    return consumerTag;
  };
}

export class RabbitExchangeConsumer extends RabbitConsumer {

  public consumeExchange = async (
    incomingExchange: string,
    exchangeType: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    // Set up the necessary channels if they are not set up already
    await this.setUpChannels();

    // Create an empty queue
    const { queue: incomingExchangeQueue } = await this.incomingChannel.assertQueue('', {
      exclusive: true, autoDelete: true, durable: false, arguments: { exchange: incomingExchange }
    });

    // Bind the queue to the exchange
    await this.incomingChannel.assertExchange(incomingExchange, exchangeType, { durable: true });
    await this.incomingChannel.bindQueue(incomingExchangeQueue, incomingExchange, '');

    // Consume incoming message
    return this.consumeIncomingMessage(incomingExchangeQueue, messageCallback, { removeConsumerImmediately });
  };
}

export class RabbitQueueConsumer extends RabbitConsumer {

  public consumeQueue = async (
    incomingQueue: string,
    messageCallback: (message: string) => Promise<object>,
    { removeConsumerImmediately }: { removeConsumerImmediately?: boolean } = {}
  ): Promise<string | undefined> => {
    // Set up the necessary channels if they are not set up already
    await this.setUpChannels();

    // Create a queue and bind it to the exchange
    await this.incomingChannel.assertQueue(incomingQueue, { autoDelete: true, durable: true });

    // Consume incoming message
    return this.consumeIncomingMessage(incomingQueue, messageCallback, { removeConsumerImmediately });
  };
}
