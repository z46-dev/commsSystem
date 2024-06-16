(await import("./lib/loadEnv.js")).default();
import * as protocol from "./lib/protocol.js";
import packetTypes from "./lib/packetTypes.js";
import ServerEnvironment from "./web/ServerEnvironment.js";
import ClientSocket from "./web/ClientSocket.js";
import { getLocationData, getSystemData, getWeatherDataAtMe } from "./lib/dataParsers.js";
import Server from "./lib/Server.js";

const envOptions = ["HOST", "PORT", "LOGINS", "PRIMEN_X", "PRIMEN_Y", "INBOUND_SEED", "OUTBOUND_SEED", "DATA_FLAGS", "RUN_SERVER", "RUN_CLIENT", "RUN_WEBSITE", "WEBSITE_PORT", "WEBSITE_ACCESS_PASSWORD"];

if (!envOptions.every(option => option in process.env)) {
    console.error("Please provide all the required environment variables");
    process.exit(1);
}

const KEY_X = BigInt(protocol.primes[process.env.PRIMEN_X]);
const KEY_Y = BigInt(protocol.primes[process.env.PRIMEN_Y]);
const INBOUND_KEYS = Array(4).fill(0).map((_, i) => BigInt(process.env.INBOUND_SEED) + BigInt(i * Number(KEY_X) * (i + 2)));
const OUTBOUND_KEYS = Array(4).fill(0).map((_, i) => BigInt(process.env.OUTBOUND_SEED) + BigInt(i * Number(KEY_Y) * (i + 2)));
const LOGINS = process.env.LOGINS.split(",").map(login => login.split("|"));

if (LOGINS.some(login => login.length !== 2)) {
    console.error("Invalid login format");
    process.exit(1);
}

if (LOGINS.some(login => login[0] === "root")) {
    console.error("Cannot use root as a username; Reserved for system use");
    process.exit(1);
}

if (process.env.RUN_SERVER === "true") {
    const serverEnvironment = new ServerEnvironment(process.env.PORT);
    LOGINS.forEach(login => serverEnvironment.addLogin(...login));
    serverEnvironment.setKeys(KEY_X, KEY_Y, INBOUND_KEYS, OUTBOUND_KEYS);
    serverEnvironment.start();

    if (process.env.RUN_CLIENT !== "nksldjaslkd") {
        async function addData() {
            const data = {};
            data.location = await getLocationData();
            data.weather = await getWeatherDataAtMe(data.location ?? await getLocationData());
            data.system = getSystemData();

            serverEnvironment.lastDatas["root"] = data;
            setTimeout(addData, 1000 * 60);
        }

        addData();
    }

    if (process.env.WEBSITE_PORT && process.env.WEBSITE_ACCESS_PASSWORD) {
        const server = new Server(process.env.WEBSITE_PORT);

        if (process.env.RUN_WEBSITE === "true") {
            server.publicize("./public");
        }

        server.post("/api/data", function handleRequest(request, response) {
            const givenKey = request.body.toString();
            if (givenKey !== process.env.WEBSITE_ACCESS_PASSWORD) {
                response.writeHead(403);
                response.end();
                return;
            }

            response.json(serverEnvironment.lastDatas);
        });

        server.listen(() => console.log(`Website server listening on port ${process.env.WEBSITE_PORT}`));
    }
}

if (process.env.RUN_CLIENT === "true") {
    const DATA_FLAGS = process.env.DATA_FLAGS.split(",");

    const client = new ClientSocket(process.env.HOST, process.env.PORT, ...LOGINS[0]);
    client.setKeys(KEY_X, KEY_Y, OUTBOUND_KEYS, INBOUND_KEYS);
    client.connect().then(validated => {
        if (!validated) {
            console.error("Failed to validate");
            process.exit(1);
        }

        console.log("Successfully validated");
        client.on("message", message => console.log("Received message:", message));
        client.on("close", () => console.log("Connection closed"));
        sendData();

        async function sendData() {
            const data = {};

            if (DATA_FLAGS.includes("location")) {
                data.location = await getLocationData();
            }

            if (DATA_FLAGS.includes("weather")) {
                data.weather = await getWeatherDataAtMe(data.location ?? await getLocationData());
            }

            if (DATA_FLAGS.includes("system")) {
                data.system = getSystemData();
            }

            client.send(packetTypes.DATA, JSON.stringify(data));
            setTimeout(sendData, 1000 * 60);
        }
    });
}