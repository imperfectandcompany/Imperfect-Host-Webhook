require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  TEBEX_SECRET: process.env.TEBEX_SECRET,
  DISCORD_WEBHOOK: process.env.DISCORD_WEBHOOK
};
