import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { execFileSync, spawn } from "node:child_process";

const PORT = 5581;
const OFFICIAL_SLUG = "core_matter_server";

const options = JSON.parse(readFileSync("/data/options.json", "utf8"));

if (process.getuid?.() === 0) {
    execFileSync("chown", ["-R", "1000:1000", "/data"]);
    process.setgroups([]);
    process.setgid(1000);
    process.setuid(1000);
}

function supervisorHeaders() {
    const token = process.env.SUPERVISOR_TOKEN;
    if (!token) return null;
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

async function supervisorGet(path) {
    const headers = supervisorHeaders();
    if (!headers) return null;
    try {
        const response = await fetch(`http://supervisor${path}`, { headers });
        if (!response.ok) {
            console.warn(`Supervisor GET ${path} failed: HTTP ${response.status}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.warn(`Supervisor GET ${path} failed:`, error);
        return null;
    }
}

function assertPortFree(port) {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.once("error", error => {
            reject(
                new Error(
                    `TCP ${port} is already in use (${error.message}). Stop the other process or change this add-on's port.`,
                ),
            );
        });
        server.once("listening", () => {
            server.close(closeError => {
                if (closeError) reject(closeError);
                else resolve();
            });
        });
        server.listen(port, "0.0.0.0");
    });
}

async function warnIfOfficialMatterAddonRunning(hostname) {
    const payload = await supervisorGet(`/addons/${OFFICIAL_SLUG}/info`);
    const state = payload?.data?.state;
    if (state !== "started") return;

    console.warn(
        [
            "Official Home Assistant Matter Server (core_matter_server) is still running.",
            "This add-on is separate and listens on TCP 5581; attestation options here do nothing",
            "until the Matter integration uses this server instead of ws://core-matter-server:5580/ws.",
            "Reconfigure Matter: do not use the official add-on, set URL to",
            `ws://${hostname}:${PORT}/ws`,
            "or ws://<Home-Assistant-IP>:5581/ws. Then you can stop the official Matter Server.",
        ].join(" "),
    );
}

async function resolveHostname() {
    const self = await supervisorGet("/addons/self/info");
    return self?.data?.hostname || process.env.HOSTNAME || "homeassistant";
}

function buildArgs() {
    const args = [
        "--storage-path=/data",
        `--port=${PORT}`,
        `--log-level=${options.log_level ?? "info"}`,
    ];

    if (options.enable_test_net_dcl) args.push("--enable-test-net-dcl");
    if (options.allow_attestation_failure) args.push("--allow-attestation-failure");
    if (options.ble_proxy) args.push("--ble-proxy");
    if (options.bluetooth_adapter_id !== undefined) {
        args.push(`--bluetooth-adapter=${options.bluetooth_adapter_id}`);
    }
    if (options.default_fabric_label) {
        args.push(`--default-fabric-label=${options.default_fabric_label}`);
    }
    if (options.time_sync === "on") {
        args.push("--enable-time-sync");
    } else if (options.time_sync === "auto") {
        try {
            const synchronized = execFileSync("timedatectl", ["show", "--property=NTPSynchronized", "--value"], {
                encoding: "utf8",
                timeout: 3000,
            }).trim();
            if (synchronized === "yes") args.push("--enable-time-sync");
            else if (synchronized !== "no") throw new Error(`Unexpected timedatectl result: ${synchronized}`);
        } catch (error) {
            console.warn(
                "Could not determine host NTP synchronization for time_sync=auto; Matter device time sync remains disabled:",
                error,
            );
        }
    }
    if (Array.isArray(options.matter_server_args)) args.push(...options.matter_server_args);
    return args;
}

const env = { ...process.env };
for (const value of options.matter_server_env_vars ?? []) {
    const separator = value.indexOf("=");
    if (separator <= 0) throw new Error(`Invalid matter_server_env_vars entry: ${value}`);
    env[value.slice(0, separator)] = value.slice(separator + 1);
}

const args = buildArgs();

try {
    await assertPortFree(PORT);
} catch (error) {
    console.error(error.message ?? error);
    process.exit(1);
}

const hostname = await resolveHostname();
await warnIfOfficialMatterAddonRunning(hostname);

console.log("Matter Server (attestation opt-in) is a separate add-on, not the official Matter Server 9.2.0.");
console.log(`allow_attestation_failure=${Boolean(options.allow_attestation_failure)}`);
console.log(`WebSocket for the Home Assistant Matter integration: ws://${hostname}:${PORT}/ws`);
console.log(`Also reachable on the host as ws://<Home-Assistant-IP>:${PORT}/ws`);
console.log(`Starting: ${args.join(" ")}`);

const server = spawn(
    process.execPath,
    ["--enable-source-maps", "/app/packages/matter-server/dist/esm/MatterServer.js", ...args],
    { env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.kill(signal));
}

server.on("error", error => {
    console.error("Failed to start Matter Server:", error);
    process.exitCode = 1;
});
server.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
});
