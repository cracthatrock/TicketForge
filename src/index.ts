import {
    Client,
    GatewayIntentBits,
} from "discord.js";

import { config } from "./config";
import { CommandService } from "./services/CommandService";
import { CommandRegistrationService } from "./services/CommandRegistrationService";
import { InteractionService } from "./services/InteractionService";
import { database } from "./database";


async function main(): Promise<void> {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.MessageContent,
        ],
    });


    const commandService = new CommandService();

    await commandService.loadCommands();

    const registrationService =
        new CommandRegistrationService(
            config.token,
            config.clientId,
            config.guildId
        );

    await registrationService.register(
        commandService.getCommands()
    );

    commandService.registerInteractionHandler(client);

    const interactionService =
        new InteractionService(
            client,
            database
        );

    interactionService.register();

    client.once("ready", () => {
        console.log(
            `Logged in as ${client.user?.tag}`
        );
    });

    await client.login(config.token);
}

main().catch((error) => {
    console.error("Fatal startup error:", error);
    process.exit(1);
});