'use strict';

const { Api } = require('telegram');

const { isEmpty } = require('./helpers');

const invokeApi = async (client,type,method,data={},debug=false,throwErrors=false) => {
  return new Promise(async (resolve, reject) => {
    try {
      let result = null;
      if (!isEmpty(Api[type][method])) result = await client.invoke(new Api[type][method](data));
      return resolve(result);
    } catch (error) {
      if (debug) console.error(`invokeApi() catching error: ${error}`);
      error = error.toString().split(':')[1].trim();
      if (throwErrors) return reject(error); else return resolve(error);
    }
  });
};

const apiMethod = async (client,type,method,data={},debug=false) => {
  try {
    return await invokeApi(client,type,method,data,debug);
  } catch (error) {
    console.error(`apiMethod() catching error: ${error}`);
  }
};

module.exports = { apiMethod };
