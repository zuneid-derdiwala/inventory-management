declare module 'quagga' {
  interface CodeResult {
    code: string;
    format: string;
  }

  interface Result {
    codeResult: CodeResult;
  }

  interface QuaggaConfig {
    src: string;
    numOfWorkers: number;
    decoder: {
      readers: string[];
    };
    locate: boolean;
    locator: {
      patchSize: string;
      halfSample: boolean;
    };
    inputStream: {
      size: number;
      singleChannel: boolean;
    };
  }

  function decodeSingle(config: QuaggaConfig, callback: (result: Result | null) => void): void;
}
