const { EmbedBuilder } = require("discord.js");
const { ranked_api } = require("mcsr-ranked-api");
const { getMatchStats } = require("../../utilities/functions/getMatchStats");

exports.run = async (client, message, args, prefix) => {
  await message.channel.sendTyping();
  const api = new ranked_api();
  let GoodToGo = false;
  let EmbedValue = 0;

  function EmbedFetch(embeds) {
    try {
      const title = embeds[0].title;
      if (title == undefined) {
        throw new Error("no title");
      }
      const matchID = title.replace("Match ID: ", "");
      if (isNaN(matchID)) {
        throw new Error("no match ID");
      }
      GoodToGo = true;
      return matchID;
    } catch (err) {
      EmbedValue++;
    }
  }

  if (message.reference && message.mentions.repliedUser?.bot) {
    const channel = client.channels.cache.get(message.reference.channelId);
    const embedMessage = channel.messages.cache.get(message.reference.messageId);
    if (embedMessage.embeds.length == 0) {
      embedMessage.channel.send({ embeds: new EmbedBuilder().setColor("Purple").setDescription("Reply to an embed of the match.") });
      return;
    }

    const matchID = EmbedFetch(embedMessage.embeds);
    if (!matchID) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor("Purple").setDescription("Reply to an embed of the match")] });
      return;
    }
    const match = await api.getMatchStats(matchID);
    const embed = await getMatchStats(match);
    message.channel.send({ embeds: [embed] });
    return;
  }

  const channel = client.channels.cache.get(message.channel.id);
  channel.messages.fetch({ limit: 100 }).then(async (messages) => {
    let embedMessages = [];
    for (const [id, message] of messages) {
      if (message.embeds.length > 0 && message.author.bot) {
        embedMessages.push(message);
      }
    }

    let matchID;
    if (!embedMessages) {
      await message.channel.send("No embeds found in the last 100 messages");
      return;
    }

    do {
      if (!embedMessages[EmbedValue].embeds[0]) break;
      matchID = EmbedFetch(embedMessages[EmbedValue].embeds);
    } while (!GoodToGo);

    const match = await api.getMatchStats(matchID);
    const _embed = await getMatchStats(match);
    message.channel.send({ embeds: [_embed] });
  });
};
exports.name = "stats";
exports.aliases = ["matchstats", "stats"];
exports.description = [
  "get match statistics by embed, the command gets the latest match embed and returns its statistics. You can choose which match to get the statistics of by replying to the embed\n\n**Parameters**\n`match_id` (optional) get match statistics by match id[mcsr ranked website](https://mcsrranked.com/)",
];
exports.usage = [`profile yorunoken\nmcsr feinberg`];
exports.category = ["minecraft"];

async function EmbedFetch(embed) {
  const beatmapId = args[0].match(/\d+/)[0];
  // if args doesn't start with https: try to get the beatmap id by number provided
  if (!args[0].startsWith("https:")) {
    beatmapId = args[0];
  }
}
