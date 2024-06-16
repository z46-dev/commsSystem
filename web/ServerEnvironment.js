import net from "net";
import ServerSocket from "./ServerSocket.js";

export default class ServerEnvironment {
    #logins = new Map();

    /** @type {net.Server} */
    #server = null;

    constructor(port) {
        this.port = port;
        this.#server = net.createServer(this.#listener.bind(this));

        /** @type {Map<string,ServerSocket>} */
        this.sockets = new Map();

        this.keyX = 1n;
        this.keyY = 1n;
        this.keyMod = 1n;
        this.toClientKeys = [1n, 1n, 1n, 1n];
        this.fromClientKeys = [1n, 1n, 1n, 1n];
    }

    #listener(socket) {
        const serverSocket = new ServerSocket(this, socket);

        serverSocket.on("validated", () => this.sockets.set(serverSocket.username, serverSocket));

        serverSocket.on("close", () => {
            console.log("Connection closed");

            if (serverSocket.validated) {
                this.sockets.delete(serverSocket.username);
            }
        });

        serverSocket.on("error", error => {
            console.error("Error occurred:", error);
        });

        serverSocket.on("end", () => {
            console.log("Connection ended by client");
        });

        serverSocket.on("message", m => console.log(`Message from ${serverSocket.username}: ${m}`));
    }

    setKeys(x, y, mod, fromClient, toClient) {
        this.keyX = x;
        this.keyY = y;
        this.keyMod = mod;
        this.fromClientKeys = fromClient;
        this.toClientKeys = toClient;
    }

    addLogin(username, password) {
        this.#logins.set(username, password);
    }

    testLogin(username, password) {
        return this.#logins.has(username) && this.#logins.get(username) === password && !this.sockets.has(username);
    }

    start() {
        this.#server.listen(this.port, () => console.log(`Server listening on port ${this.port}`));
    }
}