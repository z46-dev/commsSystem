import os from "os";
import http from "http";
import https from "https";
import { URL } from "url";

if (!(globalThis.fetch && globalThis.fetch instanceof Function)) {
    globalThis.fetch = function fetch(url, options = {}) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === "https:" ? https : http;
    
            const requestOptions = {
                method: options.method || "GET",
                headers: options.headers || {},
            };
    
            const req = protocol.request(parsedUrl, requestOptions, (res) => {
                let data = "";
    
                res.on("data", (chunk) => {
                    data += chunk;
                });
    
                res.on("end", () => {
                    const response = {
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        headers: res.headers,
                        text: () => Promise.resolve(data),
                        json: () => Promise.resolve(JSON.parse(data)),
                    };
    
                    resolve(response);
                });
            });
    
            req.on("error", (err) => {
                reject(err);
            });
    
            if (options.body) {
                req.write(options.body);
            }
    
            req.end();
        });
    }
}

export async function getLocationData() {
    try {
        const response = await fetch("http://ip-api.com/json/?fields=2155002");
        const data = await response.json();

        if (data.status !== "success") {
            throw new Error("Failed to get location data");
        }

        data.continent = data.continentCode;
        delete data.continentCode;

        data.country = data.countryCode;
        delete data.countryCode;

        data.region = data.regionName;
        delete data.regionName;

        data.ip = data.query;
        delete data.query;

        delete data.status;

        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getWeatherDataAtMe(location) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,rain,showers,snowfall,cloud_cover,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=1`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        for (const key in data.current_units) {
            if (key === "time") {
                continue;
            }

            data.current[key] = `${data.current[key]}${data.current_units[key].replace("inch", " in").replace("mp/h", " mph")}`;
        }

        delete data.current_units;
        delete data.current.interval;
        delete data.generationtime_ms;
        delete data.utc_offset_seconds;
        delete data.timezone;
        delete data.timezone_abbreviation;
        delete data.latitude;
        delete data.longitude;

        data.current.cloudCover = data.current.cloud_cover;
        delete data.current.cloud_cover;

        data.current.feelsLike = data.current.apparent_temperature;
        delete data.current.apparent_temperature;

        data.current.temperature = data.current.temperature_2m;
        delete data.current.temperature_2m;

        data.current.humidity = data.current.relative_humidity_2m;
        delete data.current.relative_humidity_2m;

        data.current.wind = `${data.current.wind_speed_10m} ${data.current.wind_direction_10m}`;
        delete data.current.wind_speed_10m;
        delete data.current.wind_direction_10m;

        const current = data.current;
        delete data.current;

        return {
            ...data,
            ...current
        };
    } catch (error) {
        console.error(error);
        return null;
    }
}

export function getSystemData() {
    const totalMemory = os.totalmem() / 1024 / 1024 / 1024;

    return {
        systemInfo: {
            platform: os.platform(),
            platformVersion: os.version(),
            arch: process.arch,
            machine: (os.machine || (() => "container"))(),
            nodeVersion: process.version,
            nodeRuntime: process.release.name,
            hostname: os.hostname(),
            username: os.userInfo().username,
            systemUptime: os.uptime(),
            nodeUptime: process.uptime()
        },

        memoryInfo: {
            systemMemory: +totalMemory.toFixed(2),
            systemMemoryUsage: +(1 - (os.freemem() / 1024 / 1024 / 1024) / totalMemory).toFixed(2),
            processMemory: +(process.memoryUsage().rss / 1024 / 1024).toFixed(2)
        },

        cpuInfo: {
            cpuModel: os.cpus()[0].model,
            cpuUsage: +(process.cpuUsage().user / 1000 / performance.now()).toFixed(2)
        },

        networkInfo: {
            networkInterfaces: Object.keys(os.networkInterfaces()),
            localAddresses: Object.values(os.networkInterfaces()).flat().map(thing => thing.address).filter(address => address && ["192.168.", "10.", "172.16."].some(block => address.startsWith(block)))
        }
    };
}

export class DataStructure {
    location = {
        continent: "",
        country: "",
        region: "",
        city: "",
        zip: "",
        lat: 0,
        lon: 0,
        timezone: ""
    };

    weather = {
        elevation: 0,
        time: "",
        rain: "",
        showers: "",
        snowfall: "",
        cloudCover: "",
        feelsLike: "",
        temperature: "",
        humidity: "",
        wind: ""
    };

    system = {
        systemInfo: {
            platform: "",
            platformVersion: "",
            arch: "",
            machine: "",
            nodeVersion: "",
            nodeRuntime: "",
            hostname: "",
            username: "",
            systemUptime: 0,
            nodeUptime: 0
        },

        memoryInfo: {
            systemMemory: 0,
            systemMemoryUsage: 0,
            processMemory: 0
        },

        cpuInfo: {
            cpuModel: "",
            cpuUsage: 0
        },

        networkInfo: {
            networkInterfaces: [""],
            localAddresses: [""]
        }
    };
}