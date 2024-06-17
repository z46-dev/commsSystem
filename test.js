import net from "net";
import DualServer from "./lib/DualServer.js";

const server = new DualServer(8080);
server.publicize("./public");
server.on("socket", socket => {
    console.log("New connection");
    socket.on("data", data => {
        console.log(data.toString());
    });
});

server.start();

const socket = net.connect(8080, "localhost");
socket.write("skdjklad");