import twilio from 'twilio';

export function createMediaStreamTwiml(mediaUrl: string): string {
  const url = new URL(mediaUrl);
  if (url.protocol !== 'wss:') {
    throw new Error('Twilio Media Streams require a wss:// URL.');
  }

  const response = new twilio.twiml.VoiceResponse();
  const connect = response.connect();
  connect.stream({ url: mediaUrl });
  return response.toString();
}
