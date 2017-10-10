import { dispatch, isStandalone } from 'codesandbox-api';

function sendUrlChange(url: string) {
  dispatch({
    type: 'urlchange',
    url,
  });
}

/* eslint-disable no-console */

const origHistoryProto = window.history.__proto__; // eslint-disable-line no-proto
const historyList = [];
let historyPosition = -1;
let disableNextHashChange = false;

function pushHistory(url, state) {
  if (historyPosition === -1 || historyList[historyPosition].url !== url) {
    historyPosition += 1;
    historyList.length = historyPosition + 1;
    historyList[historyPosition] = { url, state };
  }
}

function pathWithHash(location) {
  return `${location.pathname}${location.hash}`;
}

export default function setupHistoryListeners() {
  if (!isStandalone) {
    Object.assign(window.history, {
      go(delta) {
        console.log(`go(${delta})`);
        const newPos = historyPosition + delta;
        if (newPos >= 0 && newPos <= historyList.length - 1) {
          historyPosition = newPos;
          const { url, state } = historyList[historyPosition];
          const oldURL = document.location.href;
          origHistoryProto.replaceState.call(window.history, state, '', url);
          const newURL = document.location.href;
          if (newURL.indexOf('#') === -1) {
            window.dispatchEvent(new PopStateEvent('popstate', { state }));
          } else {
            disableNextHashChange = true;
            window.dispatchEvent(
              new HashChangeEvent('hashchange', { oldURL, newURL })
            );
          }
        }
      },

      back() {
        console.log('back()');
        window.history.go(-1);
      },

      forward() {
        console.log('forward()');
        window.history.go(1);
      },

      pushState(state, title, url) {
        origHistoryProto.replaceState.call(window.history, state, title, url);
        pushHistory(url, state);
        sendUrlChange(document.location.href);
      },

      replaceState(state, title, url) {
        origHistoryProto.replaceState.call(window.history, state, title, url);
        historyList[historyPosition] = { state, url };
        sendUrlChange(document.location.href);
      },
    });

    Object.defineProperties(window.history, {
      length: {
        get() {
          return historyList.length;
        },
      },

      state: {
        get() {
          return historyList[historyPosition].state;
        },
      },
    });

    window.addEventListener('hashchange', () => {
      if (!disableNextHashChange) {
        const url = pathWithHash(document.location);
        pushHistory(url, null);
        sendUrlChange(document.location.href);
      } else {
        disableNextHashChange = false;
      }
    });

    pushHistory(pathWithHash(document.location), null);

    setTimeout(() => {
      sendUrlChange(document.location.href);
    });
  }
}
