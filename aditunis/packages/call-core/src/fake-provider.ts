import type {
  CommunicationMode,
  ProviderAdapter,
  ProviderCallResult,
  ProviderCapabilities,
  ProviderCreateCallInput,
  TextOperation,
} from '@aditunis/contracts';

export class FakeProviderAdapter implements ProviderAdapter {
  readonly id = 'fake';
  createCallCount = 0;
  readonly createdCalls: ProviderCreateCallInput[] = [];
  readonly endedCallIds: string[] = [];
  readonly answeredCallIds: string[] = [];
  readonly dtmf: Array<{ providerCallId: string; digits: string }> = [];
  readonly textOperations: Array<{ providerCallId: string; operation: TextOperation }> = [];
  readonly stoppedOutputCallIds: string[] = [];

  async createCall(input: ProviderCreateCallInput): Promise<ProviderCallResult> {
    this.createCallCount += 1;
    this.createdCalls.push(input);
    return { providerCallId: `fake_${input.callId}` };
  }

  async answerCall(providerCallId: string): Promise<void> {
    this.answeredCallIds.push(providerCallId);
  }

  async endCall(providerCallId: string): Promise<void> {
    this.endedCallIds.push(providerCallId);
  }

  async sendText(providerCallId: string, operation: TextOperation): Promise<void> {
    this.textOperations.push({ providerCallId, operation });
  }

  async sendDtmf(providerCallId: string, digits: string): Promise<void> {
    this.dtmf.push({ providerCallId, digits });
  }

  async changeMode(
    _providerCallId: string,
    _mode: CommunicationMode,
  ): Promise<ProviderCapabilities> {
    return this.capabilities();
  }

  async stopOutput(providerCallId: string): Promise<void> {
    this.stoppedOutputCallIds.push(providerCallId);
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      voice: true,
      text: true,
      nativeRtt: false,
      tty: false,
      dtmf: true,
    };
  }
}
