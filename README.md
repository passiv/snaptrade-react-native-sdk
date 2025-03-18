# SnapTrade React Native SDK

A React Native SDK for integrating the SnapTrade connection portal into your mobile applications. This SDK handles the WebView integration and message communication between your app and the SnapTrade portal.

## Features

- ✅ Cross-platform (iOS & Android)
- ✅ Compatible with Expo and other React Native frameworks
- ✅ TypeScript support
- ✅ Simple integration with callbacks for all portal events
- ✅ Lightweight with minimal dependencies

## Installation

```bash
# Using npm
npm install snaptrade-react-native-sdk react-native-webview

# Using yarn
yarn add snaptrade-react-native-sdk react-native-webview

# Using pnpm
pnpm add snaptrade-react-native-sdk react-native-webview
```

> Note: This package depends on `react-native-webview`. If you're using Expo, WebView is already included. For bare React Native projects, follow the [react-native-webview installation instructions](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Getting-Started.md).

## Quick Start

```jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SnapTradeConnect } from 'snaptrade-react-native-sdk';

const SnapTradeScreen = () => {
  return (
    <View>
      <SnapTradeConnect
        url="https://app.snaptrade.com/snapTrade/redeemToken?token"
        onSuccess={(event) => {
          console.log('Connection successful!', event.authorizationId);
        }}
        onError={(event) => {
          console.error('Connection error:', event.detail);
        }}
        onAbandoned={() => {
          console.log('User abandoned the connection process');
        }}
      />
    </View>
  );
};

export default SnapTradeScreen;
```

## API Reference

### `SnapTradeConnect` Component Props

| Prop          | Type     | Required | Description                                                                                                    |
| ------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `url`         | string   | Yes      | Generated connection portal URL                                                                                |
| `onSuccess`   | function | No       | Callback fired when a connection is successfully established - it includes the new connection authorization id |
| `onError`     | function | No       | Callback fired when an error occurs during the connection process - it includes the error status code          |
| `onAbandoned` | function | No       | Callback fired when the user closes the connection portal                                                      |

## License

MIT
