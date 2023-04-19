const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
  ],
  shards: "auto",
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction, Partials.GuildScheduledEvent, Partials.User, Partials.ThreadMember],
});
require("dotenv/config");
const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

const token = process.env.TOKEN;

client.commands = new Collection();
client.slashcommands = new Collection();
client.commandaliases = new Collection();

const rest = new REST({ version: "10" }).setToken(token);

// command handler
const commands = [];

const prefixFolders = fs.readdirSync("./src/commands/prefix");
for (const folder of prefixFolders) {
  const commandFiles = fs.readdirSync(`./src/commands/prefix/${folder}`);

  for (const file of commandFiles) {
    const command = require(`./src/commands/prefix/${folder}/${file}`);
    client.commands.set(command.name, command);
    commands.push(command.name, command);
    if (command.aliases && Array.isArray(command.aliases)) {
      command.aliases.forEach((alias) => {
        client.commandaliases.set(alias, command.name);
      });
    }
  }
}

// slash command handler
const slashcommands = [];

const slashFolders = fs.readdirSync("./src/commands/slash");
for (const folder of slashFolders) {
  const commandFiles = fs.readdirSync(`./src/commands/slash/${folder}`);

  for (const file of commandFiles) {
    const command = require(`./src/commands/slash/${folder}/${file}`);
    slashcommands.push(command.data.toJSON());
    client.slashcommands.set(command.data.name, command);
  }
}

client.on("ready", async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: slashcommands });
    console.log(`logged in as ${client.user.tag}`);
  } catch (error) {
    console.error(error);
  }
});

// event handler
fs.readdirSync("./src/events").forEach(async (file) => {
  const event = await require(`./src/events/${file}`);
  client.on(event.name, (...args) => event.execute(...args));
});

// nodejs events
process.on("unhandledRejection", (e) => {
  console.log(e);
});
process.on("uncaughtException", (e) => {
  console.log(e);
});
process.on("uncaughtExceptionMonitor", (e) => {
  console.log(e);
});

client.login(token);
