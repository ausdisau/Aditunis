const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

function encodeSample(sampleValue: number): number {
  let sample = Math.max(-32768, Math.min(32767, Math.trunc(sampleValue)));
  let sign = 0;

  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  }

  sample = Math.min(sample, MULAW_CLIP) + MULAW_BIAS;

  let exponent = 7;
  for (
    let mask = 0x4000;
    exponent > 0 && (sample & mask) === 0;
    exponent -= 1, mask >>= 1
  ) {
    // Find the highest segment containing the biased sample.
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

function decodeSample(muLawByte: number): number {
  const value = (~muLawByte) & 0xff;
  const sign = value & 0x80;
  const exponent = (value >> 4) & 0x07;
  const mantissa = value & 0x0f;

  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;

  return sign === 0 ? sample : -sample;
}

export function decodeTwilioMulaw(base64Payload: string): Int16Array {
  const bytes = Buffer.from(base64Payload, 'base64');
  const samples = new Int16Array(bytes.length);

  for (let i = 0; i < bytes.length; i += 1) {
    samples[i] = decodeSample(bytes[i]!);
  }

  return samples;
}

export function encodeTwilioMulaw(samples: Int16Array): string {
  const bytes = Buffer.allocUnsafe(samples.length);

  for (let i = 0; i < samples.length; i += 1) {
    bytes[i] = encodeSample(samples[i]!);
  }

  return bytes.toString('base64');
}
