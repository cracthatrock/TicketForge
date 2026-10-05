import "dotenv/config";

function requireEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `Missing environment variable: ${name}`
        );
    }

    return value;
}

export const config = {
    token: requireEnv("DISCORD_TOKEN"),
    clientId: requireEnv("CLIENT_ID"),
    guildId: requireEnv("GUILD_ID"),
};