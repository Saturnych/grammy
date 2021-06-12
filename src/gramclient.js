'use strict';

require('dotenv').config();
const path = require('path');
const input = require('input');
const { TelegramClient } = require('telegram');
const { StringSession, StoreSession } = require('telegram/sessions');
const { Logger } = require('telegram/extensions');
const { NewMessage } = require('telegram/events');

const { isEmpty, getRandomInt, dateToFormat } = require('./helpers');
const { apiMethod } = require('./gramapi');

const config = { env: process.env };
config.debug = (config.env.NODE_ENV==='production')?false:true;
config.env.AUTH_DELAY = config.env.AUTH_DELAY || 300;
config.authDir = path.join(__dirname,'./_authdata');

const stringSession = new StringSession(config.env.TG_SESSION); // fill this later with the value from session.save()
const storeSessionApi = new StoreSession(`./_authdata/${config.env.TG_API_ID}/${config.env.TG_USER_PHONE}`);
const storeSessionBot = new StoreSession(`./_authdata/${config.env.TG_BOT_ID}/${config.env.TG_USER_PHONE}`);

globalThis.gram = {};

const runGram = async () => {
  try {
    const that = this;

    if (config.debug) Logger.setLevel('error'); else Logger.setLevel('none'); // only errors

    const startBot = async () => {
      const bot = new TelegramClient(storeSessionBot, config.env.TG_API_ID, config.env.TG_API_HASH, { connectionRetries: 5 });
      await bot.start({ botAuthToken: config.env.TG_BOT_TOKEN });
      await bot.session.save();
      if (config.debug) {
         console.log(`bot.getMe() = ${JSON.stringify(await bot.getMe())}`);
      }
      return bot;
    };

    const startClient = async () => {
      const client = new TelegramClient(storeSessionApi, config.env.TG_API_ID, config.env.TG_API_HASH, { connectionRetries: 5 });
      await client.start({
          phoneNumber: async () => await input.text('number ?'),
          password: async () => await input.text('password ?'),
          phoneCode: async () => await input.text('tg code ?'),
          onError: err => console.error(err),
      });
      await client.session.save();
      if (config.debug) {
         console.log(`client.getMe() = ${JSON.stringify(await client.getMe())}`);
      }
      return client;
    };

    const newMessageEvent = async (event) => {
        const client = event._client;
        const message = event.message;
        if (config.debug) console.log(`newMessageEvent() message.senderId: ${message.senderId}`);
        const sender = await message.getSender();
        // Checks if it's a private message (from user or bot)
        if (event.isPrivate) {
            // read message
            if (message.text == "hello") {
                let type = (sender.bot)?'bot':'user';
                await client.sendMessage(sender, {
                    message:`hi your id is ${message.senderId}, ${type}`
                });
            }
        }
    };

    that.bot = await startBot();
    that.client = await startClient();

    // adding event handlers for new messages
    that.client.addEventHandler(newMessageEvent, new NewMessage({}));
    that.bot.addEventHandler(newMessageEvent, new NewMessage({}));

    if (config.debug)  {
      await that.bot.sendMessage(config.env.TG_USER_NAME, { message: `hello` });
      await that.client.sendMessage(config.env.TG_BOT_NAME, { message: `hello` });
    }

    return that;
  } catch (e) {
    if (config.debug) console.error(`runGram() catching error: ${e}`);
  } finally {
    process.on('uncaughtException', function (err) {
      if (config.debug) console.error(`runGram() uncaughtException err.stack: ${JSON.stringify(err.stack,null,2)}`);
    });
    process.on('unhandledRejection', function (reason,prom) {
      if (config.debug) console.error(`runGram() unhandledRejection at: ${JSON.stringify(prom)}; reason: ${reason}`);
    });
    process.on('exit', (code) => {
      if (config.debug) console.debug(`runGram() exit with code: ${code}`);
    });
  }
};

if (!module.parent) {
  // Start server if file is run directly
  ;(async () => { globalThis.gram = await runGram() })().catch(e => console.error(`runGram() catching error: ${e}`,`catch`))
} else {
  // Export server, if file is referenced via cluster
  module.exports.runGram = runGram;
}
