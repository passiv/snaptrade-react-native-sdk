import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { handleWebViewMessage } from '../utils/messageHandler';
import { SnapTradeConnectProps } from '../types';

/**
 * SnapTradeConnect component that renders the SnapTrade connection portal in a WebView
 */
const SnapTradeConnect: React.FC<SnapTradeConnectProps> = ({
  url,
  onSuccess,
  onError,
  onAbandoned,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Handle messages from the WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (typeof event.nativeEvent.data === 'string') {
        handleWebViewMessage(event, {
          onSuccess,
          onError,
          onAbandoned,
        });
      }
    },
    [onSuccess, onError, onAbandoned]
  );

  // Inject JavaScript to listen for window messages
  const injectedJavaScript = `
    (function() {
      // Listen for window messages
      window.addEventListener('message', function(event) {
        // Only forward string messages
        if (event && event.data && typeof event.data === 'string') {
          window.ReactNativeWebView.postMessage(event.data);
        }
      });
      
      // Override postMessage to only pass strings
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message) {
        // Only pass string messages to React Native
        if (typeof message === 'string') {
          window.ReactNativeWebView.postMessage(message);
        }
        return originalPostMessage.apply(window, arguments);
      };

      true;
    })();
  `;

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
