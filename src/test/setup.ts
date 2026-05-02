import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock HTMLCanvasElement for color extraction tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: (contextType: string) => {
    if (contextType === '2d') {
      return {
        drawImage: () => {},
        getImageData: () => ({
          data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255])
        }),
        canvas: {
          width: 100,
          height: 100
        }
      };
    }
    return null;
  }
});

// Mock Image constructor for color extraction
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin: string = '';
  src: string = '';
  width: number = 100;
  height: number = 100;
  
  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;
