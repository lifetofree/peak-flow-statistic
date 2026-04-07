export async function sign(payload: object, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${btoa(JSON.stringify(payload))}.${base64Signature}`;
}

export async function verify(token: string, secret: string): Promise<any> {
  const [payloadB64, signatureB64] = token.split('.');
  if (!payloadB64 || !signatureB64) throw new Error('Invalid token');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const payloadData = encoder.encode(atob(payloadB64));
  const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));

  const valid = await crypto.subtle.verify('HMAC', key, signature, payloadData);
  if (!valid) throw new Error('Invalid signature');

  return JSON.parse(atob(payloadB64));
}
