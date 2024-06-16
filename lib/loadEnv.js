import fs from "fs";

export default function loadEnv(fileName = ".env") {
    if (!fs.existsSync(fileName)) {
        return;
    }

    const env = fs.readFileSync(fileName, "utf-8").replace(/\r/g, "");
    const lines = env.split("\n");

    for (const line of lines) {
        const [key, value] = line.split("=");
        process.env[key] = value;
    }
}