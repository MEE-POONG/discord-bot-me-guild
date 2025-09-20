// Polyfill for File API in Node.js v18
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(
      public readonly name: string,
      public readonly lastModified: number = Date.now(),
      public readonly size: number = 0,
      public readonly type: string = '',
    ) {}
    
    stream(): ReadableStream {
      return new ReadableStream({
        start(controller) {
          controller.close();
        }
      });
    }
    
    arrayBuffer(): Promise<ArrayBuffer> {
      return Promise.resolve(new ArrayBuffer(0));
    }
    
    text(): Promise<string> {
      return Promise.resolve('');
    }
    
    slice(start?: number, end?: number, contentType?: string): File {
      return new File(this.name, this.lastModified, end - (start || 0), contentType || this.type);
    }
  } as any;
}

// Polyfill for Blob API if needed
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob {
    constructor(
      public readonly parts: any[] = [],
      public readonly options: { type?: string } = {}
    ) {}
    
    get size(): number {
      return this.parts.reduce((size, part) => size + (part.length || 0), 0);
    }
    
    get type(): string {
      return this.options.type || '';
    }
    
    stream(): ReadableStream {
      return new ReadableStream({
        start(controller) {
          controller.close();
        }
      });
    }
    
    arrayBuffer(): Promise<ArrayBuffer> {
      return Promise.resolve(new ArrayBuffer(0));
    }
    
    text(): Promise<string> {
      return Promise.resolve('');
    }
    
    slice(start?: number, end?: number, contentType?: string): Blob {
      return new Blob(this.parts.slice(start, end), { type: contentType || this.type });
    }
  } as any;
}

export {};

// Ensure WebCrypto is available (needed for AEAD AES-GCM in @discordjs/voice)
try {
  // @ts-ignore - Node provides webcrypto under node:crypto
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto?.subtle) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { webcrypto } = require('node:crypto');
    if (webcrypto) {
      // @ts-ignore
      globalThis.crypto = webcrypto;
    }
  }
} catch {
  // ignore: environment without node:crypto (unlikely in Node >=16)
}
