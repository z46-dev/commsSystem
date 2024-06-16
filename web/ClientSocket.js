import net from "net";

import * as protocol from "../lib/protocol.js";
import packetTypes from "../lib/packetTypes.js";

export default class ClientSocket {
    #events = {};

    /** @type {net.Socket} */
    #socket = null;

    constructor(host, port, username, password) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;

        this.keyX = 1n;
        this.keyY = 1n;
        this.keyMod = 1n;
        this.fromServerKeys = [1n, 1n, 1n, 1n];
        this.toServerKeys = [1n, 1n, 1n, 1n];

        /** @type {protocol.CRYPTO} */
        this.cryptoFromServer = null;

        /** @type {protocol.CRYPTO} */
        this.cryptoToServer = null;
    }

    on(event, callback) {
        if (!this.#events[event]) {
            this.#events[event] = [];
        }

        this.#events[event].push(callback);
    }

    #emit(event, ...args) {
        if (!this.#events[event]) {
            return;
        }

        for (const callback of this.#events[event]) {
            callback(...args);
        }
    }

    setKeys(x, y, mod, fromServer, toServer) {
        this.keyX = x;
        this.keyY = y;
        this.keyMod = mod;
        this.fromServerKeys = fromServer;
        this.toServerKeys = toServer;

        this.cryptoFromServer = new protocol.CRYPTO(...this.fromServerKeys);
        this.cryptoToServer = new protocol.CRYPTO(...this.toServerKeys);
    }

    connect() {
        this.#socket = net.connect(this.port, this.host);

        this.#socket.on("data", this.onData.bind(this));
        this.#socket.on("close", () => this.#emit("close"));
        this.#socket.on("error", error => this.#emit("error", error));
        this.#socket.on("end", () => this.#emit("end"));

        this.send(packetTypes.HANDSHAKE, [this.username, this.password]);
        return new Promise(resolve => this.on("validated", resolve));
    }

    send(type, data) {
        const writer = new protocol.Writer(true);
        writer.setUint8(type);

        switch (type) {
            case packetTypes.HANDSHAKE:
                writer.setStringUTF8(data[0]);
                writer.setStringUTF8(data[1]);
                break;
            case packetTypes.MESSAGE:
                writer.setStringUTF8(data);
                break;
            case packetTypes.TERMINATE:
                throw new Error("Terminate packet should not be sent from client");
        }

        this.#socket.write(this.cryptoToServer.changePacket(writer.build()));
    }

    end() {
        this.#socket.end();
    }

    onData(data) {
        const reader = new protocol.Reader(new DataView(this.cryptoFromServer.changePacket(new Uint8Array(data)).buffer), 0, true);
        const type = reader.getUint8();

        switch (type) {
            case packetTypes.HANDSHAKE:
                this.#emit("validated", reader.getUint8() === 1);
                break;
            case packetTypes.MESSAGE:
                this.#emit("message", reader.getStringUTF8());
                break;
            case packetTypes.TERMINATE:
                this.#emit("terminate", reader.getStringUTF8());
                break;
        }
    }
}