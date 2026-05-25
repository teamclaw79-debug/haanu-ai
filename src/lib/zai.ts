import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: InstanceType<typeof ZAI> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}
