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
        try {
          const data = JSON.parse(event.nativeEvent.data);

          // Handle cookie capture
          if (data.type === 'AUTH_COOKIES') {
            console.log('AUTH_COOKIES:', data.cookies);
            return;
          }

          // Handle API request details
          if (data.type === 'API_REQUEST_DETAILS') {
            console.log('API Request Captured:');
            console.log('URL:', data.url);
            console.log('Method:', data.method);
            console.log('Headers:', data.headers);
            console.log('Status:', data.status, data.statusText);
            console.log('Available Cookies:', data.cookies);
            return;
          }
        } catch (e) {
          // Not JSON or parsing error, continue with normal handling
        }

        // Handle standard messages
        handleWebViewMessage(event, {
          onSuccess,
          onError,
          onAbandoned,
        });
      }
    },
    [onSuccess, onError, onAbandoned]
  );

  // Base script for messaging
  const baseScript = `
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

  // Cookie capture script
  const cookieCaptureScript = `
    (function() {
      // Flag to ensure we only capture cookies once after login
      let capturedAfterLogin = false;
      
      // Function to extract all cookies
      function captureAuthCookies() {
        const cookieStr = document.cookie;
        const cookies = {};
        
        // Parse all cookies
        cookieStr.split(';').forEach(cookie => {
          const parts = cookie.trim().split('=');
          if (parts.length >= 2) {
            const name = parts[0];
            const value = parts.slice(1).join('='); // Handle values with =
            cookies[name] = value;
          }
        });
        
        // Check if we're on an authenticated page
        const isAuthPage = 
          window.location.href.includes('dashboard') || 
          window.location.href.includes('account') || 
          window.location.href.includes('personal') ||
          document.querySelector('.dashboard') ||
          document.querySelector('[data-testid="account-summary"]');
        
        if (isAuthPage) {
          cookies.is_authenticated = true;
        }
        
        // Only send if we found cookies
        if (Object.keys(cookies).length > 0) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'AUTH_COOKIES',
            cookies: cookies,
            url: window.location.href
          }));
          capturedAfterLogin = true;
          return true;
        }
        
        return false;
      }
      
      // Monitor GraphQL and API requests
      const monitorAPIRequests = function() {
        // Track if we've captured a request
        let capturedAPIRequest = false;
        
        // Intercept XHR to capture API requests
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
          const xhr = new originalXHR();
          const originalOpen = xhr.open;
          const originalSetRequestHeader = xhr.setRequestHeader;
          
          // Track request headers
          const requestHeaders = {};
          
          xhr.setRequestHeader = function(name, value) {
            // Store the header
            requestHeaders[name] = value;
            return originalSetRequestHeader.apply(this, arguments);
          };
          
          xhr.open = function(method, url) {
            // Store the URL and method
            this._url = url;
            this._method = method;
            return originalOpen.apply(this, arguments);
          };
          
          // Listen for when the request completes
          xhr.addEventListener('load', function() {
            if (this._url && 
                (this._url.includes('graphql') || this._url.includes('vanguard.com/api')) && 
                this.status >= 200 && this.status < 300 && 
                !capturedAPIRequest) {
              
              capturedAPIRequest = true;
              capturedAfterLogin = true;
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'API_REQUEST_DETAILS',
                url: this._url,
                method: this._method,
                headers: requestHeaders,
                status: this.status,
                statusText: this.statusText,
                cookies: document.cookie
              }));
            }
          });
          
          return xhr;
        };
        
        // Also intercept fetch for modern apps
        const originalFetch = window.fetch;
        window.fetch = function(resource, init = {}) {
          // Extract request details
          const url = typeof resource === 'string' ? resource : resource.url;
          const method = init.method || 'GET';
          
          if (url && 
              (url.includes('graphql') || url.includes('vanguard.com/api')) && 
              !capturedAPIRequest) {
            
            // Create a promise to capture the fetch result
            const promise = originalFetch.apply(this, arguments);
            
            promise.then(response => {
              if (response.ok && !capturedAPIRequest) {
                capturedAPIRequest = true;
                capturedAfterLogin = true;
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'API_REQUEST_DETAILS',
                  url: url,
                  method: method,
                  headers: init.headers || {},
                  status: response.status,
                  statusText: response.statusText,
                  cookies: document.cookie
                }));
              }
            }).catch(() => {});
            
            return promise;
          }
          
          return originalFetch.apply(this, arguments);
        };
      };
      
      // Start API monitoring
      monitorAPIRequests();
      
      // Check after form submission (login)
      document.addEventListener('submit', function(e) {
        setTimeout(function() {
          if (!capturedAfterLogin) captureAuthCookies();
        }, 1500);
      });
      
      // Check periodically for a short time
      let checkCount = 0;
      const cookieCheck = setInterval(function() {
        checkCount++;
        if (capturedAfterLogin || checkCount > 15) {
          clearInterval(cookieCheck);
        } else {
          captureAuthCookies();
        }
      }, 1000);
      
      // Initial capture
      captureAuthCookies();
    })();
  `;

  // Final injected script
  const injectedJavaScript = `${baseScript}\n${cookieCaptureScript}`;

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
