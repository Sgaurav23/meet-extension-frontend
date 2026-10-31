const chromeApi = globalThis.chrome;

function callStorage(method, ...args) {
  return new Promise((resolve, reject) => {
    if (!chromeApi?.storage?.local) {
      reject(new Error('Chrome extension storage is unavailable.'));
      return;
    }

    chromeApi.storage.local[method](...args, (result) => {
      const error = chromeApi.runtime?.lastError;
      if (error) reject(new Error(error.message));
      else resolve(result);
    });
  });
}

export default callStorage