import { SnapTradeEventType, SnapTradeEvents } from '../types';

export const parseWebViewMessage = (event: any): SnapTradeEvents | null => {
  try {
    let messageString: string | null = null;

    if (
      event &&
      event.nativeEvent &&
      typeof event.nativeEvent.data === 'string'
    ) {
      messageString = event.nativeEvent.data;
    } else if (typeof event === 'string') {
      messageString = event;
    } else if (event && typeof event.data === 'string') {
      messageString = event.data;
    }

    // If not a string message, ignore it
    if (!messageString) {
      return null;
    }

    // Handle "SUCCESS:AUTHORIZATION_ID"
    if (messageString.startsWith('SUCCESS:')) {
      const authorizationId = messageString.substring('SUCCESS:'.length).trim();
      return {
        type: SnapTradeEventType.SUCCESS,
        status: 'SUCCESS',
        authorizationId,
      };
    }

    // Handle "ERROR:STATUS_CODE"
    if (messageString.startsWith('ERROR:')) {
      const statusCode = messageString.substring('ERROR:'.length).trim();
      return {
        type: SnapTradeEventType.ERROR,
        status: 'ERROR',
        statusCode: parseInt(statusCode, 10) || 400,
        detail: `Error with status code: ${statusCode}`,
      };
    }

    // Handle ABANDONED
    if (messageString === 'ABANDONED') {
      return {
        type: SnapTradeEventType.ABANDONED,
        value: 'ABANDONED',
      };
    }

    // Ignore any other message formats
    return null;
  } catch (error) {
    console.error('SnapTrade SDK: Error parsing WebView message', error);
    return null;
  }
};

export const handleWebViewMessage = (
  event: any,
  callbacks: {
    onSuccess?: (event: any) => void;
    onError?: (event: any) => void;
    onAbandoned?: (event: any) => void;
    onClosed?: (event: any) => void;
  }
) => {
  try {
    const parsedEvent = parseWebViewMessage(event);

    if (!parsedEvent) {
      return;
    }

    // Call the appropriate callback based on the event type
    switch (parsedEvent.type) {
      case SnapTradeEventType.SUCCESS:
        callbacks.onSuccess && callbacks.onSuccess(parsedEvent);
        break;

      case SnapTradeEventType.ERROR:
        callbacks.onError && callbacks.onError(parsedEvent);
        break;

      case SnapTradeEventType.ABANDONED:
        callbacks.onAbandoned && callbacks.onAbandoned(parsedEvent);
        break;
    }
  } catch (error) {
    console.error('SnapTrade SDK: Error in handleWebViewMessage', error);
  }
};
