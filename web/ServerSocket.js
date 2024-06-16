import * as protocol from "../lib/protocol.js";
import packetTypes from "../lib/packetTypes.js";

export default class ServerSocket {
    #events = {};

    /** @param {import("./ServerEnvironment.js").default} serverEnvironment @param {import("net").Socket} socket */
    constructor(serverEnvironment, socket) {
        this.serverEnvironment = serverEnvironment;
        this.socket = socket;
        this.cryptoIn = new protocol.CRYPTO(...this.serverEnvironment.fromClientKeys);
        this.cryptoOut = new protocol.CRYPTO(...this.serverEnvironment.toClientKeys);

        this.socket.on("data", this.onData.bind(this));
        this.socket.on("close", () => this.#emit("close"));
        this.socket.on("error", error => this.#emit("error", error));
        this.socket.on("end", () => this.#emit("end"));

        this.validated = false;
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

    encode(type, data) {
        const writer = new protocol.Writer(true);
        writer.setUint8(type);

        switch (type) {
            case packetTypes.HANDSHAKE:
                writer.setUint8(data);
                break;
            case packetTypes.MESSAGE:
            case packetTypes.TERMINATE:
                writer.setStringUTF8(data);
                break;
        }

        return this.cryptoOut.changePacket(writer.build());
    }

    send(type, data) {
        this.socket.write(this.encode(type, data));
    }

    end(type, data) {
        this.socket.end(this.encode(type, data));
    }

    onData(data) {
        const reader = new protocol.Reader(new DataView(this.cryptoIn.changePacket(new Uint8Array(data)).buffer), 0, true);
        const type = reader.getUint8();

        if (type === packetTypes.HANDSHAKE) {
            if (this.validated) {
                this.end(packetTypes.TERMINATE, "Already validated");
                return;
            }

            this.username = reader.getStringUTF8();
            if (this.serverEnvironment.testLogin(this.username, reader.getStringUTF8())) {
                this.validated = true;
                this.send(packetTypes.HANDSHAKE, 1);
                this.#emit("validated");
            } else {
                this.end(packetTypes.HANDSHAKE, 0);
            }
            return;
        }

        if (!this.validated) {
            this.end(packetTypes.TERMINATE, "Not validated");
            return;
        }

        switch (type) {
            case packetTypes.MESSAGE:
                this.#emit("message", reader.getStringUTF8());
                break;
            case packetTypes.DATA:
                this.#emit("data", JSON.parse(reader.getStringUTF8()));
                break;
        }
    }
}