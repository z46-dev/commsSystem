import net from "net";
import http from "http";

import url from "url";
import fs from "fs";

function responsify(response, server) {
    response.send = function (content) {
        response.writeHead(200, server.responseHeaders);
        response.end(content);
    }
    response.json = function (json) {
        if (typeof json === "object") {
            json = JSON.stringify(json);
        }
        response.send(json);
    }
    return response;
}

function getMimeType(file) {
    let ext = file.split(".").pop();
    switch (ext) {
        case "html":
            return "text/html";
        case "css":
            return "text/css";
        case "js":
            return "text/javascript";
        case "json":
            return "application/json";
        case "png":
            return "image/png";
        case "jpg":
            return "image/jpg";
        case "gif":
            return "image/gif";
        case "svg":
            return "image/svg+xml";
        case "ico":
            return "image/x-icon";
        case "ttf":
            return "font/ttf";
        case "otf":
            return "font/otf";
        case "woff":
            return "font/woff";
        case "woff2":
            return "font/woff2";
        case "eot":
            return "font/eot";
        case "wav":
            return "audio/wav";
        case "mp3":
            return "audio/mpeg";
        case "ogg":
            return "audio/ogg";
        case "pdf":
            return "application/pdf";
        case "zip":
            return "application/zip";
        case "rar":
            return "application/x-rar-compressed";
        case "7z":
            return "application/x-7z-compressed";
        case "doc":
            return "application/msword";
        case "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case "xls":
            return "application/vnd.ms-excel";
        case "xlsx":
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        case "ppt":
            return "application/vnd.ms-powerpoint";
        case "pptx":
            return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        case "xml":
            return "application/xml";
        case "txt":
            return "text/plain";
        case "wasm":
            return "application/wasm";
        default:
            return "application/octet-stream";
    }
}

const pageNotFound = `
<!DOCTYPE html>
<html>
    <head>
        <title>Page not found</title>
        <style>
            * {
                font-family: sans-serif;
                font-size: x-large;
                font-weight: bold;
            }
            body {
                width: 100%;
                height: 100%;
                padding: 0px;
                margin: 0px;
                background-image: repeating-conic-gradient(#F8F8F8 0 15deg, #FFFFFF 15deg 30deg);
                background-attachment: fixed;
                text-align: center;
            }
            #mainBody {
                position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
            }
            #mainBody h1 {
                font-size: xxx-large;
            }
            .smaller {
                font-size: large;
                font-weight: normal;
            }
            #footer {
                position: absolute;
                bottom: 5%;
                      left: 50%;
                      transform: translate(-50%, -50%);
            }
        </style>
    </head>
    <body>
        <div id="mainBody">
            <h1>404</h1>
            <span>The page or resource you requested cannot be served.</span><br/>
            <span class="smaller">If you know the site's manager or owner, please contact them.</span>
        </div>
        <span id="footer" class="smaller">This site is powered by a custom webserver engine made by Evan G. Parker.</span>
    </body>
</html>
`;

// A server that handles http requests and net.Socket connections on the same port.
export default class DualServer {
    /** @type {net.Server} */
    #server = null;

    /** @type {http.Server} */
    #httpServer = null;

    #events = {};

    constructor(port, accessControlAllowOrigin = "*") {
        if (!Number.isFinite(parseInt(port)) || parseInt(port) !== Math.round(parseInt(port))) {
            throw new RangeError("The argument 'port' must be a valid integer!");
        }

        this.#server = net.createServer(this.#listener.bind(this));
        this.#httpServer = http.createServer((request, response) => this.#handleHTTP(request, response));

        this.port = port;
        this.getMethods = new Map();
        this.postMethods = new Map();
        this.publicDirectory = -1;
        this.responseHeaders = {
            "Access-Control-Allow-Origin": accessControlAllowOrigin,
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
            "Access-Control-Max-Age": 2592000
        };
    }

    #emit(event, ...args) {
        if (this.#events[event]) {
            this.#events[event].forEach(listener => listener(...args));
        }
    }

    on(event, listener) {
        if (!this.#events[event]) {
            this.#events[event] = [];
        }

        this.#events[event].push(listener);
    }

    /** @param {net.Socket} socket */
    #listener(socket) {
        let buffer = Buffer.alloc(0);

        socket.on("data", chunk => {
            buffer = Buffer.concat([buffer, chunk]);

            if (buffer.length >= 4) {
                const method = buffer.slice(0, 4).toString("utf8");
                socket.removeAllListeners("data");

                if (["GET ", "POST", "HEAD", "PUT ", "DEL "].includes(method)) {
                    this.#httpServer.emit("connection", socket);
                } else {
                    this.#emit("socket", socket)
                }

                socket.unshift(buffer);
            }
        });

        socket.on("error", console.error);
    }

    #handleHTTP(request, response) {
        const path = url.parse(request.url).pathname.replace(/\/+$/, "") || "/";
        response = responsify(response, this);

        if (this.getMethods.has(path)) {
            this.getMethods.get(path)(request, response);
            return;
        }

        if (this.postMethods.has(path) && request.method === "POST") {
            let body = Buffer.alloc(1);

            request.on("data", function parse(chunk) {
                body = Buffer.concat([body, Buffer.from(chunk)]);
            });

            request.on("end", () => {
                request.body = body.slice(1);
                this.postMethods.get(path)(request, response);
            });
            return;
        }

        if (this.publicDirectory !== -1) {
            const filePath = this.publicDirectory + (path === "/" ? "/index.html" : path);
            if (fs.existsSync(filePath)) {
                if (fs.statSync(filePath).isDirectory()) {
                    response.writeHead(404, this.responseHeaders);
                    response.end(pageNotFound);
                    return;
                }

                response.setHeader("Content-Type", getMimeType(filePath));
                response.send(fs.readFileSync(filePath));
                return;
            }
        }

        response.writeHead(404, this.responseHeaders);
        response.end(pageNotFound);
    }

    get(rout, callback) {
        this.getMethods.set(rout, callback);
    }

    post(rout, callback) {
        this.postMethods.set(rout, callback);
    }

    publicize(path) {
        this.publicDirectory = path;
    }

    start() {
        this.#server.listen(this.port, arguments[0]);
    }
}