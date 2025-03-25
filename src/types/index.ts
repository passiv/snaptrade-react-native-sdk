export enum SnapTradeEventType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  ABANDONED = 'ABANDONED',
}

export interface SnapTradeEvent {
  type: SnapTradeEventType;
}

export interface SnapTradeSuccessEvent extends SnapTradeEvent {
  type: SnapTradeEventType.SUCCESS;
  status: 'SUCCESS';
  authorizationId: string;
}

export interface SnapTradeErrorEvent extends SnapTradeEvent {
  type: SnapTradeEventType.ERROR;
  status: 'ERROR';
  statusCode: number;
  detail: string;
}

export interface SnapTradeAbandonedEvent extends SnapTradeEvent {
  type: SnapTradeEventType.ABANDONED;
  value: 'ABANDONED';
}

export type SnapTradeEvents =
  | SnapTradeSuccessEvent
  | SnapTradeErrorEvent
  | SnapTradeAbandonedEvent;

export interface SnapTradeConnectProps {
  url: string;
  onSuccess?: (event: SnapTradeSuccessEvent) => void;
  onError?: (event: SnapTradeErrorEvent) => void;
  onAbandoned?: (event: SnapTradeAbandonedEvent) => void;
  directMode?: boolean;
}
