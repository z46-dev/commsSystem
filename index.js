import net from "net";
(await import("./lib/loadEnv.js")).default();
import * as protocol from "./lib/protocol.js";
import packetTypes from "./lib/packetTypes.js";
import ServerEnvironment from "./web/ServerEnvironment.js";
import ClientSocket from "./web/ClientSocket.js";

const envOptions = ["PORT", "USERNAME", "PASSWORD", "PRIMEN_X", "PRIMEN_Y", "PRIMEN_MOD", "INBOUND_SEED", "OUTBOUND_SEED"];

if (!envOptions.every(option => option in process.env)) {
    console.error("Please provide all the required environment variables");
    process.exit(1);
}

const PORT = process.env.PORT;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const KEY_X = BigInt(protocol.primes[process.env.PRIMEN_X]);
const KEY_Y = BigInt(protocol.primes[process.env.PRIMEN_Y]);
const MOD = BigInt(process.env.PRIMEN_MOD);
const INBOUND_KEYS = Array(4).fill(0).map((_, i) => BigInt(process.env.INBOUND_SEED) + BigInt(i * Number(KEY_X) * (i + 2)));
const OUTBOUND_KEYS = Array(4).fill(0).map((_, i) => BigInt(process.env.OUTBOUND_SEED) + BigInt(i * Number(KEY_Y) * (i + 2)));

const serverEnvironment = new ServerEnvironment(PORT);
serverEnvironment.addLogin(USERNAME, PASSWORD);
serverEnvironment.setKeys(KEY_X, KEY_Y, MOD, INBOUND_KEYS, OUTBOUND_KEYS);
serverEnvironment.start();


const client = new ClientSocket("localhost", PORT, USERNAME, PASSWORD);
client.setKeys(KEY_X, KEY_Y, MOD, OUTBOUND_KEYS, INBOUND_KEYS);
client.connect().then(validated => {
    if (!validated) {
        console.error("Failed to validate");
        process.exit(1);
    }

    console.log("Successfully validated");

    client.on("message", message => console.log("Received message:", message));
    client.on("close", () => console.log("Connection closed"));

    setInterval(() => {
        client.send(packetTypes.MESSAGE, "Message: " + (performance.now() / 1000).toFixed(2));
    }, 1000);
});