const { SlashCommandBuilder } = require("@discordjs/builders");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { ranked_api } = require("mcsr-ranked-api");
const { getMatch } = require("../../../utilities/functions/getMatch.js");
const { getMatchStats } = require("../../../utilities/functions/getMatchStats");
const fs = require("fs");

async function run(interaction, username, opponentname, ENCRYPTED, match_type, index) {
  const api = new ranked_api();

  let ranked_data;
  try {
    ranked_data = await api.getRecentMatch(username, { match_type: match_type, opponent: opponentname });
  } catch (err) {
    await interaction.reply({ ephemeral: true, content: "", embeds: [new EmbedBuilder().setColor("Purple").setDescription(`${err}`)] });
    return;
  }

  const nextPage = new ButtonBuilder().setCustomId("next").setLabel("Next match").setStyle(ButtonStyle.Secondary);
  const stats = new ButtonBuilder().setCustomId("stats").setLabel("Get statistics").setStyle(ButtonStyle.Primary);
  const prevPage = new ButtonBuilder().setCustomId("prev").setLabel("Previous match").setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(prevPage, stats, nextPage);

  const embed = await getMatch(ranked_data[index], ENCRYPTED, username, index);
  const response = await interaction.reply({ content: "", embeds: [embed], components: [row] });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = response.createMessageComponentCollector({ time: 20000, filter: filter });

  collector.on("collect", async (i) => {
    if (i.customId === "next") {
      index++;

      if (index > ranked_data.length) {
        index--;
      }
      const embed = await getMatch(ranked_data[index], ENCRYPTED, username, index);

      await response.edit({ embeds: [embed], components: [row] });
    } else if (i.customId === "prev") {
      index--;

      if (0 >= index) {
        index++;
      }
      const embed = await getMatch(ranked_data[index], ENCRYPTED, username, index);

      await response.edit({ embeds: [embed], components: [row] });
    } else if (i.customId === "stats") {
      let title = i.message.embeds[0].title;
      const matchID = title.replace("Match ID: ", "");
      const match = await api.getMatchStats(matchID);
      const embed = await getMatchStats(match);
      await response.edit({ embeds: [embed], components: [] });
    }
  });

  collector.on("end", async (i) => {
    await response.edit({ embeds: [i.message.embeds[0]], components: [] });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("match")
    .setDescription("Get a user's selected match")
    .addStringOption((option) => option.setName("user").setDescription("get a match by username").setRequired(false))
    .addStringOption((option) => option.setName("opponent").setDescription("get a profile by username").setRequired(false))
    .addIntegerOption((option) => option.setName("index").setDescription("Index of the match").setMinValue(1).setMaxValue(50).setRequired(false))
    .addStringOption((option) => option.setName("type").setDescription("Select a match type").setRequired(false).addChoices({ name: "ranked", value: "2" }, { name: "casual", value: "1" }, { name: "private", value: "3" })),
  run: async (client, interaction) => {
    let ENCRYPTED = false;
    const opponent = interaction.options.getString("opponent") ?? undefined;
    let username = interaction.options.getString("user");
    if (!username) {
      const userData = JSON.parse(await fs.promises.readFile("./src/db/user-data.json"));
      try {
        username = userData[interaction.user.id].MinecraftUserID;
      } catch (err) {
        await interaction.replace({ ephmeral: true, content: "Set your minecraft username using /link" });
      }
      username = username.replace(/!{ENCRYPTED}$/, "");
      ENCRYPTED = true;
    }
    const match_type = interaction.options.getString("type") ?? undefined;
    let index = interaction.options.getInteger("index") - 1 ?? 0;
    if (index < 0) {
      index = 0;
    }

    await run(interaction, username, opponent, ENCRYPTED, match_type, index);
  },
};
