export interface TwilioConnectedEvent {
  event: 'connected';
}

export interface TwilioStartEvent {
  event: 'start';
  streamSid: string;
  start: {
    streamSid: string;
    callSid: string;
  };
}

export interface TwilioMediaEvent {
  event: 'media';
  streamSid: string;
  media: {
    payload: string;
  };
}

export interface TwilioMarkEvent {
  event: 'mark';
  streamSid: string;
  mark: {
    name: string;
  };
}

export interface TwilioStopEvent {
  event: 'stop';
  streamSid: string;
  stop: {
    accountSid?: string;
    callSid: string;
  };
}

export type ParsedTwilioMediaEvent =
  | TwilioConnectedEvent
  | TwilioStartEvent
  | TwilioMediaEvent
  | TwilioMarkEvent
  | TwilioStopEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, key: string): string | undefined {
  return isRecord(value) && typeof value[key] === 'string'
    ? value[key] as string
    : undefined;
}

export function parseTwilioMediaEvent(raw: string): ParsedTwilioMediaEvent | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || typeof parsed.event !== 'string') {
    return undefined;
  }

  switch (parsed.event) {
    case 'connected':
      return { event: 'connected' };

    case 'start': {
      const streamSid = stringField(parsed, 'streamSid') ?? stringField(parsed.start, 'streamSid');
      const callSid = stringField(parsed.start, 'callSid');
      if (!streamSid || !callSid) return undefined;
      return {
        event: 'start',
        streamSid,
        start: { streamSid, callSid },
      };
    }

    case 'media': {
      const streamSid = stringField(parsed, 'streamSid');
      const payload = stringField(parsed.media, 'payload');
      if (!streamSid || payload === undefined) return undefined;
      return {
        event: 'media',
        streamSid,
        media: { payload },
      };
    }

    case 'mark': {
      const streamSid = stringField(parsed, 'streamSid');
      const name = stringField(parsed.mark, 'name');
      if (!streamSid || name === undefined) return undefined;
      return {
        event: 'mark',
        streamSid,
        mark: { name },
      };
    }

    case 'stop': {
      const streamSid = stringField(parsed, 'streamSid');
      const callSid = stringField(parsed.stop, 'callSid');
      if (!streamSid || !callSid) return undefined;
      const accountSid = stringField(parsed.stop, 'accountSid');
      return {
        event: 'stop',
        streamSid,
        stop: accountSid ? { accountSid, callSid } : { callSid },
      };
    }

    default:
      return undefined;
  }
}

export interface TwilioClearMessage {
  event: 'clear';
  streamSid: string;
}

export interface TwilioOutboundMediaMessage {
  event: 'media';
  streamSid: string;
  media: {
    payload: string;
  };
}

export function createClearMessage(streamSid: string): TwilioClearMessage {
  return { event: 'clear', streamSid };
}

export function createMediaMessage(
  streamSid: string,
  payload: string,
): TwilioOutboundMediaMessage {
  return {
    event: 'media',
    streamSid,
    media: { payload },
  };
}
