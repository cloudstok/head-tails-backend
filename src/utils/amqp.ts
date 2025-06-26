import amqp, { Channel, Options } from "amqplib";

let pubChannel: Channel | null = null;
let subChannel: Channel | null = null;
let connected = false;

const AMQP_CONNECTION_STRING = process.env.AMQP_CONNECTION_STRING;
const AMQP_EXCHANGE_NAME = process.env.AMQP_EXCHANGE_NAME;

if (!AMQP_CONNECTION_STRING || !AMQP_EXCHANGE_NAME) {
    throw new Error('Environment variables AMQP_CONNECTION_STRING or AMQP_EXCHANGE_NAME are not set');
}

const exchange = AMQP_EXCHANGE_NAME;

export const initQueue = async (): Promise<void> => {
    await connect();
}

export const connect = async (): Promise<void> => {
    if (connected && pubChannel && subChannel) return;

    try {
        console.log('RabbitMQ server is getting connected...');
        const connection = await amqp.connect(AMQP_CONNECTION_STRING);
        console.log('RabbitMQ server is connection is ready ');
        [pubChannel, subChannel] = await Promise.all([
            connection.createChannel(),
            connection.createChannel()
        ]);
        await pubChannel.assertExchange(exchange, "x-delayed-message", {
            autoDelete: false,
            durable: true,
            arguments: { "x-delayed-type": "direct" }
        }) as Options.AssertExchange

        pubChannel.removeAllListeners('close');
        pubChannel.removeAllListeners('error');
        subChannel.removeAllListeners('close');
        subChannel.removeAllListeners('error');

        pubChannel.on('close', async () => {
            console.log('Publish Channel Closed');
            pubChannel = null;
            connected = false;
        })

        pubChannel.on('error', (msg: unknown) => {
            console.log(`Publish Channel Error: `, msg);
        })

        subChannel.on('close', async () => {
            console.log('Subscribe Channel Closed');
            subChannel = null;
            connected = false;
            setTimeout(() => initQueue(), 1000);
        })

        subChannel.on('error', (msg: unknown) => {
            console.log(`Subscribe Channel Error: `, msg);
        })

        console.log('RabbitMQ connected successfully');
        connected = true;

    } catch (err: any) {
        console.log('Error while connection to RabbitMQ server ...');
    }

}

export const sendToQueue = async (
    ex: string,
    queueName: string,
    message: string,
    delay: number = 0,
    retries: number = 0
): Promise<void> => {
    try {
        if (!pubChannel || (pubChannel as any).connection?._closing) {
            await connect();
        }
        if (!pubChannel) throw new Error('Publish Channel is not initiated');

        await pubChannel.assertQueue(queueName, { durable: true });
        await pubChannel.bindQueue(queueName, exchange, queueName);

        pubChannel.publish(
            exchange,
            queueName,
            Buffer.from(message),
            {
                headers: {
                    "x-delay": delay,
                    "x-retries": retries
                },
                persistent: true
            } as Options.Publish
        )

        console.log(`Message is sent to ${queueName} queue with ${exchange} exhange with data ${JSON.stringify(message)}`);

    }
    catch (err: any) {
        console.log(`Failed to send the ${queueName} queue with exchange ${exchange}: ${err.message}`);
    }
}