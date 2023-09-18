export default class RabbitConstants {

  public static CHANNEL_PREFETCH_COUNT = 10;
  public static MAX_QUEUE_LENGTH = 500;
  public static CONSUMER_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
}
